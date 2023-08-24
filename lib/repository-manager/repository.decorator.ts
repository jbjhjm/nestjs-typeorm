import { SetMetadata } from '@nestjs/common';
import { EntityClassOrSchema } from '../interfaces/entity-class-or-schema.type';

export const REPOSITORY_ENTITY = 'RepositoryEntityMeta';

export function CustomRepository(entity: EntityClassOrSchema): ClassDecorator {
	return SetMetadata(REPOSITORY_ENTITY, entity);
}
