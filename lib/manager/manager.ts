import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityMetadata, EntitySubscriberInterface, Repository } from 'typeorm';
import { TypeOrmModuleOptions } from '../interfaces';
import { EntityClassOrSchema } from '../interfaces/entity-class-or-schema.type';
import { TYPEORM_MODULE_OPTIONS } from '../typeorm.constants';
import { ColorizedLogger } from '../utils';
import { MixinRepository, REPOSITORY_ENTITY, RepositoryMixinDefinition } from '../repository';




@Injectable()
export class DataSourceManager {

	private readonly logger = new ColorizedLogger('DataSourceManager',{},'magenta');
	private mixinRegistry = new Map<EntityClassOrSchema|'all', RepositoryMixinDefinition[]>()
	private setupCompleted = false;

	constructor(
		@Inject(TYPEORM_MODULE_OPTIONS) private options: TypeOrmModuleOptions,
		private dataSource:DataSource
	) {this.setup()}

	setup() {
		// create all custom repository classes that have been registered.
		const ds = this.dataSource;

		const {baseRepository} = this.options;
		ds.entityMetadatas.forEach(meta=>{
			const entity = meta.target;
			if(typeof entity === 'string') {
				// this will be the case for auto-generated Entities e.g. join table of ManyToMany relations.
				this.logger.warn('skipped entity "'+entity+'" because it has no Entity class')
				return;
			}
			const customRepoClass = this.findCustomRepositoryClass(entity);
			if(customRepoClass) {
				this.createCustomRepositoryClass(ds, entity, customRepoClass)
				this.logger.log('"'+entity.name+'" assigned custom Repo "'+customRepoClass.name+'"')
			} else if(baseRepository) {
				this.createCustomRepositoryClass(ds, entity, baseRepository)
				this.logger.log('"'+entity.name+'" assigned custom BaseRepository')
			} else {
				this.createCustomRepositoryClass(ds, entity, MixinRepository as any)
				this.logger.log('"'+entity.name+'" assigned standard Repository')
			}
		})

		this.mixinRegistry.forEach((mixins, entity) => {
			mixins.forEach((mixin) => {
				this.applyMixin(mixin,entity)
			})
		})

		this.setupCompleted = true;
	}

	// ========= Manage Subscribers =========================================
	
	addSubscriber(subscriber:EntitySubscriberInterface ) {
		this.dataSource.subscribers.push(subscriber);
	}

	// ========= Manage Repository Mixins ===================================

	/**
	 * TODO: Known limitation: "all" will only patch all entities within the current collection.
	 * A "global all" is not possible yet.
	 */
	addMixin(mixin:RepositoryMixinDefinition,entity:EntityClassOrSchema|'all') {
		const mixinsForEntity = this.mixinRegistry.get(entity) || []

		mixinsForEntity.push(mixin);
		this.mixinRegistry.set(entity,mixinsForEntity);
		
		if(this.setupCompleted) {
			this.applyMixin(mixin,entity)
		}
	}

	private applyMixin(mixin:RepositoryMixinDefinition,entity:EntityClassOrSchema|'all') {
		let repos:MixinRepository[];
		if(entity==='all') {
			repos = this.dataSource.entityMetadatas
				.filter(meta=>!this.isTreeEntity(meta))
				.map(meta=>{
					return this.dataSource.getRepository(meta.target) as MixinRepository
				})
		} else {
			repos = [this.dataSource.getRepository(entity) as MixinRepository];
		}
		repos.forEach(repo=>{
			this.assertValidRepositoryClass(repo)
			repo.applyMixin(mixin)
		})

		const repoNameList = repos.map(r=>r.constructor.name).join(',')
		this.logger.log('mixin "'+mixin.name+'" applied to ('+repos.length+') '+repoNameList)

	}

	// ========= Manage Repository classes ==================================

	getRepository(entity:EntityClassOrSchema) {
		const ds = this.dataSource;

		const enitityMetadata = ds.entityMetadatas.find((meta) => meta.target === entity);
		if(this.isTreeEntity(enitityMetadata)) {
			return ds.getTreeRepository(entity)
		} else {
			// we can just do this because typeOrm reads custom Repositories created in setup() from cache, if existing!
			return ds.getRepository(entity);
		}
	}

	private findCustomRepositoryClass(entity: EntityClassOrSchema) {
		if(this.options.repositories) {
			for(const Repo of this.options.repositories) {
				const forEntity = Reflect.getMetadata(REPOSITORY_ENTITY, Repo);
				if(forEntity === entity) return Repo
			}
		}

		if(this.options.baseRepository) {
			return this.options.baseRepository
		}

		return null;
	}

	private createCustomRepositoryClass(ds: DataSource, entity: EntityClassOrSchema, repoClass:new(...args:any[])=>MixinRepository) {

		const repo = new repoClass(
			entity,
			ds.manager,
			ds.manager.queryRunner
		)

		if(repoClass !== MixinRepository) {
			this.assertValidRepositoryClass(repo)
		}

		this.propagateRepoClassToTypeOrm(ds,repo);

		return repo;
	}

	private propagateRepoClassToTypeOrm(ds: DataSource, repo:MixinRepository) {

		// add repository to typeOrm cache. Repositories is protected so we use array syntax to force access to it.
		// this is a hack required to trick typeOrm into thinking it has already created a repo class for this entity.
		// typeOrm will use our custom repo class for this entity from now on.

		const repos = ds.manager['repositories'];
		if(repos instanceof Map) {
			// latest typeOrm version
			repos.set(repo.target,repo);
		} else if(Array.isArray(repos)) {
			// older typeOrm versions use array
			const target = repo.target;
			const filtered = (repos as any[]).filter(r=>r.target!==target);
			filtered.push(repo);
			(ds as any).manager['repositories'] = filtered;
		}

	}

	// ========= Utils =======================================================

	private assertValidRepositoryClass(repo:MixinRepository) {
		if(!(repo instanceof MixinRepository)) {
			const name = (repo as Repository<any>).constructor.name || (repo as any).toString()
			throw new Error('Custom Repository "'+name+'" does not extend MixinRepository class!')
		}
	}

	private isTreeEntity(enitityMetadata:EntityMetadata|undefined) {
		return typeof enitityMetadata?.treeType !== 'undefined';
	}

}