import { PublicUser, User } from '../models/user.model';

export function sanitizeUser(user: User): PublicUser {
  const { password, ...publicUser } = user;
  void password;
  return publicUser;
}
