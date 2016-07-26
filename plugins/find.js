const Promise = require('bluebird');

module.exports = function findModule(options) {
  const { mongoConnection } = options;
  const act = Promise.promisify(this.act, { context: this });

  this.add({ role: 'users', cmd: 'find' }, (msg, done) => {
    act({ role: 'acl', cmd: 'check' }) // check permissions
      .then(res => {
        if (!res.allow) {
          throw new Error(403);
        }
        return mongoConnection;
      })
      .then(db => db.collection('users').find())
      .then(res => done(null, res))
      .catch(err => {
        done(err);
      });
  });
};
