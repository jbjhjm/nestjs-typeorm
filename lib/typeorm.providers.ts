import { Provider } from '@nestjs/common';
import { DataSource, DataSourceOptions, getMetadataArgsStorage } from 'typeorm';
import { getRepositoryToken } from './common/typeorm.utils';
import { EntityClassOrSchema } from './interfaces/entity-class-or-schema.type';
import { RepositoryManager, getRepositoryManagerToken } from './repository-manager';

/**
 * createTypeOrmProviders is used within forFeature, so it is not bound to a certain forRoot / dataSource ID!
 */

export function createTypeOrmProviders(
  entities?: EntityClassOrSchema[],
  dataSource?: DataSource | DataSourceOptions | string,
): Provider[] {
	return (entities || []).map((entity) => ({
		provide: getRepositoryToken(entity, dataSource),
		useFactory: (repoMgr: RepositoryManager) => {
			return repoMgr.getRepository(entity)
		},
		inject: [getRepositoryManagerToken(dataSource)],
		/**
		 * Extra property to workaround dynamic modules serialisation issue
		 * that occurs when "TypeOrm#forFeature()" method is called with the same number
		 * of arguments and all entities share the same class names.
		 */
		targetEntitySchema: getMetadataArgsStorage().tables.find(
			(item) => item.target === entity,
		),
	}));
}
