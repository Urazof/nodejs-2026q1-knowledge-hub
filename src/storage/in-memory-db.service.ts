import { Injectable } from '@nestjs/common';
import { Article } from '../common/models/article.model';
import { Category } from '../common/models/category.model';
import { Comment } from '../common/models/comment.model';
import { User } from '../common/models/user.model';

@Injectable()
export class InMemoryDbService {
  readonly users: User[] = [];
  readonly articles: Article[] = [];
  readonly categories: Category[] = [];
  readonly comments: Comment[] = [];
}
