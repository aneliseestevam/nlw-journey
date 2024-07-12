import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { dayjs } from '../lib/dayjs';

export async function updateTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().put('/trips/:tripId', {
    schema: {
      params: z.object({
        tripId: z.string().uuid(),
      }),
      body: z.object({
        destination: z.string().min(4),
        startsAt: z.coerce.date(),
        endsAt: z.coerce.date(),
      }),
    },
  } , async (request) => {
    const { tripId } = request.params
    const { destination, startsAt, endsAt } = request.body;

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
      },
    });

    if (!trip) {
      throw new Error("Trip not found");
    }

    if (dayjs(startsAt).isBefore(new Date())) {
      throw new Error('Invalid trip start date');
    }

    if (dayjs(endsAt).isBefore(startsAt)) {
      throw new Error('Invalid trip end date');
    }

    await prisma.trip.update({
      where: {
        id: tripId,
      },
      data: {
        destination,
        startsAt,
        endsAt,
      },
    });

    return { tripId: tripId };
  });
}