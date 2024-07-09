import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import 'dayjs/locale/pt-br';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getMailClient } from '../lib/mail';
import nodemailer from 'nodemailer';

dayjs.locale('pt-br');
dayjs.extend(localizedFormat);

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

    const formattedStartsAt = dayjs(startsAt).format('LL');
    const formattedEndsAt = dayjs(endsAt).format('LL');

    const confirmationLink = `http://localhost:3000/trips/${trip.id}/confirm`;

    const mail = await getMailClient();

    const message = await mail.sendMail({
      from: {
        name: 'Equipe plann.er',
        address: 'plann.er@plan.com.br',
      },
      to: {
        name: ownerName,
        address: ownerEmail,
      },
      subject: `Confirme sua viagem para ${destination} em ${formattedStartsAt}`,
      html: `
        <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
          <p>Você solicitou a criação de uma viagem para <strong>${destination}</strong> nas datas de ${formattedStartsAt} até ${formattedEndsAt}.</p>
          <p></p>
          <p>Para confirmar sua viagem, clique no link abaixo:</p>
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

    return { tripId: trip.id };
  });
}