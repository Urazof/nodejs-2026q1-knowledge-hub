import prisma from '../lib/prisma';

type Role = 'viewer' | 'editor' | 'admin';

const promoteUserRole = async (userId: string, role: Role): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { role: role.toUpperCase() as 'ADMIN' | 'EDITOR' | 'VIEWER' },
  });
};

export default promoteUserRole;
