import { Repository } from 'typeorm';

export interface RepositoryMixinObject {
	[k:string]:any
}

export type RepositoryMixinFactory = (parent:Repository<any>) => RepositoryMixinObject;

export interface RepositoryMixinDefinition {
	name:string,
	factory:RepositoryMixinFactory
}

export interface IMixinRepository {
	applyMixin: (mixin:RepositoryMixinDefinition) => void
}


