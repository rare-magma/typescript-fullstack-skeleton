import { ContainerBuilder, Definition } from 'node-dependency-injection';
import DynamodbConfigFactory from '@src/config/infrastructure/persistence/dynamodb/dynamodbConfigFactory';
import DdbOneTableConfigFactory from '@src/config/infrastructure/persistence/ddbOneTable/ddbOneTableConfigFactory';
import EventBridgeConfigFactory from '@src/config/infrastructure/eventBus/eventBridge/eventBridgeConfigFactory';

const register = (container: ContainerBuilder): void => {
    let definition = new Definition();
    definition.setFactory(DynamodbConfigFactory, 'createConfig');
    container.setDefinition('Apps.<YourBoundedContext>.Serverless.DynamodbConfig', definition);

    definition = new Definition();
    definition.setFactory(DdbOneTableConfigFactory, 'createConfig');
    container.setDefinition('Apps.<YourBoundedContext>.Serverless.DdbOneTableConfig', definition);

    definition = new Definition();
    definition.setFactory(EventBridgeConfigFactory, 'createConfig');
    container.setDefinition('Apps.<YourBoundedContext>.Serverless.EventBridgeConfig', definition);
};

export default register;
