<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>


# @yooniversity/nestjs-typeorm

[TypeORM](http://typeorm.io) module for [Nest](https://github.com/nestjs/nest).
Based on `@nestjs/typeorm`, but with additional features.

[original library docs](https://docs.nestjs.com/techniques/sql)

## Installation

```bash
$ npm i --save @yooniversity/nestjs-typeorm
```

## New Feature: Repository Management

### Disclaimer

_This library is shared because we know typeOrm extendability is something that lots of devs are missing._
_This package uses some tricks+hacks to achieve extendability. It may cause issues when updating TypeOrm._
_It works fine within our own setup, but might be difficult to set up for other projects._
_The library does not aim to provide a general, highly-compatible or easy-to-use solution!_
_Primarily it is here to be used for our own projects._
_Feel free to try out, fork or let it inspire you to implement your own solution._

### TypeOrm flaws and how this libary helps

TypeOrm itself has very bad extension possibilities.
Unfortunately the devs are not going to change this - see https://github.com/typeorm/typeorm/issues/9312

TypeOrm uses an internal repository instance cache and hardcoded repository classes.
It features a repository extension system which works by

- instancing a regular repo
- calling repository.extend which will return an instance of a child class with passed functionality composed onto it.

This has severe flaws:

- extended repositories will never be added to the internal repository instance cache
- meaning all internal actions using repos will never use extended repositories
- must be called every time after using dataSource/connection.getRepository - as this will point to the un-extended repository
- must be called individually for each Entities' repository

This library does some trickery allowing to break these limitations.

`@yooniversity/nestjs-typeorm` allows to:

- specify base Repository class per connection
- specify Repository class specific to one Entity
- Mixins which allow Repositories to be enhanced (similar to typeOrms Repository.extend system)
- specified custom classes and mixins will be auto-applied when injecting a repository, no need to remember any custom setup routines when using the repository.

@nestjs/typeorm has a simple custom repository system as well. Comparison:

|            | @nestjs/typeorm | @yooniversity/nestjs-typeorm |
| ---        | --- | --- |
| Concept    | registered custom repos CAN be used | registered repos WILL be used |
| Setup      | Custom repos must be listed in every forFeature | Custom repos need to be specified once in the forRoot setup. |
| Injection  | Custom repos must be injected explicitly | Registered repos are detected and auto-injected instead of standard repo classes. |
| Mixins     | N/A | Repos can be enhanced using mixins. |


### Custom Base Repository

Within TypeOrmModule configuration, a new property `baseRepository` can be specified.
The passed class will be used for ALL entities within the defined connection, except for TreeEntities and entities with a specific custom repository (see below).
Note that the class must extend the class `MixinRepository` exported from this package.

### Specific Repository for Entity

Within TypeOrmModule configuration, a new property `repositories` can be specified.
It should contain an Array of Repository classes. Each class must:

- extend the class `MixinRepository` exported from this package
- has to have the `CustomRepository(<entity>)` decorator assigned - this specifies which Entity the Custom Repository belongs to.

### Mixins

Opposed to typeOrm's extend system, mixins make use of runtime modification of class instances.
This is required because repository providers are created eagerly.
As described above, extend system works by creating a new child class.
Providers do not know about such child classes though.

Example on how to register a mixin:

```ts

@Injectable()
export class Foo {

	constructor(
		@InjectDataSourceManager('<connectionId>') dsManager
	) {
		dsManager.addMixin({
			name:'ThisIsMyMixin',
			factory:(parentRepo:Repository<UserEntity>)=>{		
				// the returned object will be merged into the Repository instance
				return {
					save: async (
						entityOrEntities: T | T[],
						options?: SaveOptions,
					)=>{
						// execute parent save logic
						// doing it this way has the benefit of allowing mixin overrides to be stacked
						const result = await parentRepo.save.call(parentRepo,entityOrEntities,options);
						// do whatever should be done ... then
						return result;
					},
					customFunctionality: ()=> {
						// ...
					}
				}
			}
		}, UserEntity /* or 'all' to apply mixin to every Entity registered within the DataSource/Connection */)
	}

}

```

### How to validate your setup

Check your nestjs startup log. Search for [DataSourceManager]. It will log info on what Repository and Mixins are being used.


## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

* Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
* Website - [https://nestjs.com](https://nestjs.com/)
* Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
