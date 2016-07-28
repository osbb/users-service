import seneca from 'seneca';
import { MongoClient } from 'mongodb';

const mongoHost = process.env.MONGO_PORT_27017_TCP_ADDR;
const mongoPort = process.env.MONGO_PORT_27017_TCP_PORT;
const mongoConnection = MongoClient.connect(`mongodb://${mongoHost}:${mongoPort}`);

import { findPlugin } from './plugins/find';

seneca()
  .client({
    host: process.env.ACL_PORT_10101_TCP_ADDR,
    port: process.env.ACL_PORT_10101_TCP_PORT,
  })
  .use(findPlugin, { mongoConnection })
  .listen();
