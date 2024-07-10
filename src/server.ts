import fastify from 'fastify';
import cors from '@fastify/cors';
import { createTrip } from './routes/create-trip';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { confirmTrip } from './routes/confirm-trip';
import { confirmParticipants } from './routes/confirm-participant';
import { createActivity } from './routes/create-activity';
import { getActivities } from './routes/get-activities';
import { createLinks } from './routes/create-link';
import { getLinks } from './routes/get-links';

const app = fastify();

app.register(cors, {
  origin: '*',
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(createTrip);
app.register(confirmTrip);
app.register(confirmParticipants);
app.register(createActivity);
app.register(getActivities);
app.register(createLinks);
app.register(getLinks);

app.listen({ port: 3000 }, (err, address) => {
  address = 'http://localhost:3000';

  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});