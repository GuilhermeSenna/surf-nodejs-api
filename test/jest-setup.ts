import { SetupServer } from '@src/server';
import supertest from 'supertest';

// First test started
beforeAll(() => {
  const server = new SetupServer();
  server.init();
  global.testRequest = supertest(server.getApp());
});
