import { ObjectLiteral, Repository } from 'typeorm';
import { IMixinRepository, RepositoryMixinDefinition } from './interfaces';

export class MixinRepository<TEntity extends ObjectLiteral = object> extends Repository<TEntity> implements IMixinRepository {
	/**
	 * the typeOrm way of extending creates a new repo child class + instance.
	 * This does not work as in the moment of patching, repo provider factories have already been executed and created default instances.
	 * To handle this, ALL Repositories are being created/inherit this custom Repo which allows to create runtime-mixins on existing class.
	 */
	__loaded_mixins__:string[] = [];

	applyMixin(
        mixin:RepositoryMixinDefinition
    ) {
		if(this.__loaded_mixins__.includes(mixin.name)) {
			return;
		}
		this.__loaded_mixins__.push(mixin.name)
		const mixinObj = mixin.factory(this);
		if(mixinObj === null) return;

		for (const propName in mixinObj) {
            (this as any)[propName] = mixinObj[propName]
		}
    }
}
