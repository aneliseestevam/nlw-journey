import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { dayjs } from '../lib/dayjs';
import { ClientError } from '../errors/client-error';
import { getMailClient } from '../lib/mail';
import { env } from '../env';

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
      throw new ClientError('Invalid trip start date');
    }

    if (dayjs(endsAt).isBefore(startsAt)) {
      throw new ClientError('Invalid trip end date');
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

    const formattedStartsAt = dayjs(trip.startsAt).format('LL');
    const formattedEndsAt = dayjs(trip.endsAt).format('LL');

    const confirmationLink = `${env.API_BASE_URL}/trips/${trip.id}/confirm`;

    const mail = await getMailClient();

    await mail.sendMail({
      from: {
        name: 'Equipe plann.er',
        address: 'oi@planner.com',
      },
      to: {
        name: ownerName,
        address: ownerEmail,
      },
      subject: `Confirmação da viagem para ${destination} em ${formattedStartsAt}`,
      html: `
        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
          <p>Olá ${ownerName},</p>
          <p>Estamos felizes em te informar que a sua viagem para ${destination} está confirmada!</p>
          <p>Confirme sua presença clicando no link abaixo:</p>
          <p><a href="${confirmationLink}">Clique aqui para confirmar</a></p>
          <p>Detalhes da viagem:</p>
          <p>Destino: ${destination}</p>
          <p>Data de início: ${formattedStartsAt}</p>
          <p>Data de término: ${formattedEndsAt}</p>
        </div>
      `,
    });

    return { tripId: trip.id };
  });
}