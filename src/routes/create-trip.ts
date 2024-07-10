import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { dayjs } from '../lib/dayjs';

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/trips', {
    schema: {
      body: z.object({
        destination: z.string().min(4),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
        ownerName: z.string().min(4),
        ownerEmail: z.string().email(),
        emailsToInvite: z.array(z.string().email()),
      }),
    },
  } , async (request) => {
    const { destination, startsAt, endsAt, ownerName, ownerEmail, emailsToInvite } = request.body;

    if (dayjs(startsAt).isBefore(new Date())) {
      throw new Error('Invalid trip start date');
    }

    if (dayjs(endsAt).isBefore(startsAt)) {
      throw new Error('Invalid trip end date');
    }

    const trip = await prisma.trip.create({
      data: {
        destination,
        startsAt,
        endsAt,
        participants: {
          createMany: {
            data: [
              {
                name: ownerName,
                email: ownerEmail,
                isOwner: true,
                isConfirmed: true,
              },
              ...emailsToInvite.map(email => {
                return { email }
              }),
            ],
          }
        },
      },
    });

    return { tripId: trip.id };
  });
}