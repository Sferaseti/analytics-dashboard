import { db } from '../lib/db/drizzle';
import { users } from '../lib/db/schema';
import { hashPassword } from '../lib/auth/session';
import { eq } from 'drizzle-orm';

async function createSuperAdmin() {
  const email = 'admin@admin.com';
  const password = 'admin123';
  const passwordHash = await hashPassword(password);

  try {
    // Проверяем, существует ли уже супер-админ
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('Супер-администратор уже существует:', email);
      return;
    }

    // Создаем супер-администратора
    const [admin] = await db
      .insert(users)
      .values({
        email: email,
        passwordHash: passwordHash,
        role: 'super_admin',
        name: 'Super Admin'
      })
      .returning();

    console.log('Супер-администратор создан успешно!');
    console.log('Email:', email);
    console.log('Пароль:', password);
    console.log('ID:', admin.id);

  } catch (error) {
    console.error('Ошибка создания супер-администратора:', error);
    process.exit(1);
  }
}

createSuperAdmin()
  .then(() => {
    console.log('Скрипт завершен.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка выполнения скрипта:', error);
    process.exit(1);
  });