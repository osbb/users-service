import chai from 'chai';
import { MongoClient, ObjectId } from 'mongodb';
import * as Users from '../users';

chai.should();

let db;

before(() => MongoClient.connect('mongodb://localhost:27017/testing')
  .then(conn => {
    db = conn;
  })
);

describe('Users Service', () => {
  const users = [
    { _id: new ObjectId() },
    { _id: new ObjectId() },
    { _id: new ObjectId() },
  ];

  before(() => db.collection('users').insert(users));

  after(() => db.collection('users').remove({}));

  it(
    'should load users from database',
    () => Users.load(db)
      .then(res => {
        res.should.have.length(3);
      })
  );

  it(
    'should update user in database',
    () => Users.update(db, Object.assign({}, { _id: users[0]._id, firstName: 'test' }))
      .then(res => {
        res.should.have.property('firstName').equal('test');
      })
  );

  it(
    'should create user in database',
    () => Users.create(db, Object.assign({}, { firstName: 'test' }))
      .then(res => {
        res.should.have.property('firstName').equal('test');
      })
  );
});
