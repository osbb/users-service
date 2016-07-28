import Promise from 'bluebird';
import { ObjectId } from 'mongodb';

export function findPlugin(options) {
  const { mongoConnection } = options;
  const act = Promise.promisify(this.act, { context: this });

  this.add({ role: 'users', cmd: 'find' }, (msg, done) => {
    const { _id } = msg;

    act({ role: 'acl', cmd: 'check' }) // check permissions
      .then(res => {
        if (!res.allow) {
          throw new Error(403);
        }
        return mongoConnection;
      })
      .then(db => db
        .collection('users')
        .find({ _id: ObjectId(_id) })
        .limit(1)
        .next()
      )
      .then(data => {
        if (data === null) {
          done(null, { error: { code: 404, message: 'Not Found' } });
        } else {
          done(null, data);
        }
      })
      .catch(err => {
        done(err);
      });
  });
}
