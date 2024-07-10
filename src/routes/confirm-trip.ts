import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getMailClient } from '../lib/mail';
import { dayjs } from '../lib/dayjs';
import nodemailer from 'nodemailer';

export async function confirmTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId/confirm', {
    schema: {
      params: z.object({
        tripId: z.string().uuid(),
      }),
    },
  } , async (request, reply) => {
    const { tripId } = request.params;

    const trip = await prisma.trip.findUnique({
      where: {
        id: tripId,
      },
      include: {
        participants: {
          where: {
            isOwner: false,
          },
        }
      }
    });

    if (!trip) {
      throw new Error('Trip not found');
    }

    if (trip.isConfirmed) {
      return reply.redirect(`http://localhost:3000/trips/${trip.id}`);
    }

    await prisma.trip.update({
      where: {
        id: tripId,
      },
      data: {
        isConfirmed: true,
      },
    });

    const formattedStartsAt = dayjs(trip.startsAt).format('LL');
    const formattedEndsAt = dayjs(trip.endsAt).format('LL');

    const mail = await getMailClient();

    await Promise.all(trip.participants.map(async (participant) => {
      const confirmationLink = `http://localhost:3000/participants/${participant.id}/confirm`;

      const message = await mail.sendMail({
        from: {
          name: 'Equipe plann.er',
          address: 'plann.er@plan.com.br',
        },
        to: participant.email,
        subject: `Confirme sua presença na viagem para ${trip.destination} em ${formattedStartsAt}`,
        html: `
          <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
            <p>Você foi convidado para participar de uma viagem para <strong>${trip.destination}</strong> nas datas de <strong>${formattedStartsAt}</strong> até <strong>${formattedEndsAt}</strong>.</p>
            <p></p>
            <p>Para confirmar sua presença na viagem, clique no link abaixo:</p>
            <p></p>
            <p>
              <a href="${confirmationLink}">Confirmar viagem</a>
            </p>
            <p></p>
            <p>Caso você não saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
          </div>
        `.trim()
      });
  
      console.log(nodemailer.getTestMessageUrl(message));
    }));

    return reply.redirect(`http://localhost:3000/trips/${tripId}`);
  })
}