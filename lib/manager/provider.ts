import { Connection, DataSource, DataSourceOptions } from 'typeorm'
import { getDataSourceToken } from '../common'
import { TypeOrmModuleOptions } from '../interfaces'
import { DataSourceManager } from './manager'
import { DEFAULT_DATA_SOURCE_NAME, TYPEORM_MODULE_OPTIONS } from '../typeorm.constants'
import { Inject, Type } from '@nestjs/common'

export function getDataSourceManagerToken(
	dataSource:
		| DataSource
		| DataSourceOptions
		| string = DEFAULT_DATA_SOURCE_NAME,
): string | Function | Type<DataSource> {
	return DEFAULT_DATA_SOURCE_NAME === dataSource
		? DataSource ?? Connection
		: 'string' === typeof dataSource
		? `${dataSource}DataSourceManager`
		: DEFAULT_DATA_SOURCE_NAME === dataSource.name || !dataSource.name
		? DataSource ?? Connection
		: `${dataSource.name}DataSourceManager`;
}

export const InjectDataSourceManager: (
	dataSource?: DataSource | DataSourceOptions | string,
) => ReturnType<typeof Inject> = (
	dataSource?: DataSource | DataSourceOptions | string,
) => Inject(getDataSourceManagerToken(dataSource));
  

export function createDataSourceManagerProvider(options:DataSourceOptions) {
	return {
		provide: getDataSourceManagerToken(options),
		// must have dependency on dataSource so that the class is only being created AFTER async dataSource provider has been resolved!
		useFactory: (typeOrmOptions: TypeOrmModuleOptions,dataSource: DataSource)=>{
			return new DataSourceManager(typeOrmOptions,dataSource)
		},
		inject: [TYPEORM_MODULE_OPTIONS, getDataSourceToken(options)]
	}
}

