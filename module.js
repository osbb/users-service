import amqp from 'amqplib';
import { MongoClient, ObjectId } from 'mongodb';
import winston from 'winston';

const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const connection = MongoClient.connect(mongoUrl); // connection promise
const usersCollectionPromise = connection.then(db => db.collection('users'));

function loadUsers() {
  return usersCollectionPromise
    .then(c => c.find({}).toArray());
}

function updateUser(user) {
  const { title, answer } = user;

  return usersCollectionPromise
    .then(c => c.updateOne({ _id: ObjectId(user._id) }, { $set: { title, answer } }))
    .then(() => usersCollectionPromise
      .then(c => c.findOne({ _id: ObjectId(user._id) }, {}))
    );
}

function createUser(user) {
  const { title, answer } = user;

  return usersCollectionPromise
    .then(c => c.insertOne({ title, answer }, {}))
    .then(res => usersCollectionPromise
      .then(c => c.findOne({ _id: ObjectId(res.insertedId) }, {}))
    );
}

const connectToRabbitMQ = new Promise(resolve => {
  function openConnection() {
    winston.info('Connecting to RabbitMQ...');
    amqp.connect(rabbitmqUrl)
      .then(conn => {
        winston.info('Connected!');
        resolve(conn);
      })
      .catch(() => {
        winston.info('Connection failure. Retry in 5 sec.');
        setTimeout(() => {
          openConnection();
        }, 5000);
      });
  }
  openConnection();
});

connectToRabbitMQ
  .then(conn => conn.createChannel())
  .then(ch => {
    ch.assertExchange('events', 'topic', { durable: true });
    ch.assertQueue('users-service', { durable: true })
      .then(q => {
        ch.prefetch(1);
        ch.bindQueue(q.queue, 'events', 'users.*');

        ch.consume(q.queue, msg => {
          let data;

          try {
            data = JSON.parse(msg.content.toString());
          } catch (err) {
            winston.error(err, msg.content.toString());
            return;
          }

          switch (msg.fields.routingKey) {
            case 'users.load':
              loadUsers(ch, data)
                .then(users => {
                  ch.sendToQueue(
                    msg.properties.replyTo,
                    new Buffer(JSON.stringify(users)),
                    { correlationId: msg.properties.correlationId }
                  );
                  ch.ack(msg);
                });
              break;
            case 'users.update':
              updateUser(data)
                .then(user => {
                  ch.sendToQueue(
                    msg.properties.replyTo,
                    new Buffer(JSON.stringify(user)),
                    { correlationId: msg.properties.correlationId }
                  );
                  ch.ack(msg);
                });
              break;
            case 'users.create':
              createUser(data)
                .then(user => {
                  ch.sendToQueue(
                    msg.properties.replyTo,
                    new Buffer(JSON.stringify(user)),
                    { correlationId: msg.properties.correlationId }
                  );
                  ch.ack(msg);
                });
              break;
            default:
              ch.nack(msg);
              return;
          }
        }, { noAck: false });
      });
  });
