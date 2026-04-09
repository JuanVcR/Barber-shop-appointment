import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../src/database/prisma.js';
async function main() {
    const userPassword = await bcrypt.hash('123456', 10);
    const barberPassword = await bcrypt.hash('123456', 10);
    const barbarshop = await prisma.barbershop.upsert({
        where: { slug: 'barbearia-alpha' },
        update: {},
        create: {
            name: 'Barbearia Alpha',
            slug: 'barbearia-alpha',
            phoneOwner: '5581999999999',
        },
    });
    const user = await prisma.user.upsert({
        where: { email: 'cliente@teste.com' },
        update: {},
        create: {
            name: 'Cliente Teste',
            email: 'cliente@teste.com',
            phone: '5581999999999',
            password: userPassword,
        },
    });
    const barber = await prisma.barber.upsert({
        where: { email: 'carlos@barber' },
        update: {},
        create: {
            name: 'Carlos',
            email: 'carlos@barber',
            phone: '5581988888888',
            password: barberPassword,
            barbershopId: barbershop.id,
        },
    });
}
//# sourceMappingURL=seed.js.map