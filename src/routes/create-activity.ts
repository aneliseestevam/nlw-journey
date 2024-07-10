import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { dayjs } from '../lib/dayjs';

export async function createActivity(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post('/trips/:tripId/activities', {
    schema: {
      params: z.object({
        tripId: z.string().uuid(),
      }),
      body: z.object({
        title: z.string(),
        date: z.coerce.date(),
      }),
    },
  } , async (request) => {
    const { tripId } = request.params;
    const { title, date } = request.body;

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
      },
    });

    if (!trip) {
      throw new Error('Trip not found');
    }

    if (dayjs(date).isBefore(dayjs(trip.startsAt)) || dayjs(date).isAfter(dayjs(trip.endsAt))) {
      throw new Error('Activity date must be within the trip dates');
    }

    const activity = await prisma.activity.create({
      data: {
        title,
        date: new Date(date),
        tripId,
      },
    });

    return { activityId: activity.id };
  });
}