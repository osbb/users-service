import { ObjectId } from 'mongodb';

export function load(db) {
  return db.collection('users').find({}).toArray();
}

export function update(db, user) {
  return db.collection('users')
    .updateOne({ _id: ObjectId(user._id) }, { $set: user })
    .then(() => db.collection('users').findOne({ _id: ObjectId(user._id) }, {}));
}

export function create(db, user) {
  return db.collection('users')
    .insertOne(user, {})
    .then(res => db.collection('users').findOne({ _id: ObjectId(res.insertedId) }, {}));
}
