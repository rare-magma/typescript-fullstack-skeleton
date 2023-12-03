import { IoTClient, IoTClientConfig } from '@aws-sdk/client-iot';
import { captureAWSv3Client } from 'aws-xray-sdk';
import { Nullable } from '@src/domain/nullable';
import IotCoreConfig from '@src/infrastructure/eventBus/iotCore/iotCoreConfig';
import { Logger } from '@src/domain/logger';

export default class IotClientFactory {
    private static clients: Record<string, IoTClient> = {};

    static createClient(contextName: string, config: IotCoreConfig, logger: Logger): IoTClient {
        let client = IotClientFactory.getClient(contextName);

        if (!client) {
            client = IotClientFactory.create(config, logger);

            IotClientFactory.registerClient(client, contextName);
        }

        return client;
    }

    private static getClient(contextName: string): Nullable<IoTClient> {
        return IotClientFactory.clients[contextName] || null;
    }

    private static create(config: IotCoreConfig, logger: Logger): IoTClient {
        const awsConfig = this.extractClientConfig(config, logger),
            client = new IoTClient(awsConfig);

        if (config.enableTracing) {
            captureAWSv3Client(client);
        }

        return client;
    }

    private static extractClientConfig(config: IotCoreConfig, logger: Logger): IoTClientConfig {
        const { region, endpoint } = config,
            clientConfig = {
                logger
            };

        if (region) {
            Object.assign(clientConfig, { region });
        }

        if (endpoint) {
            Object.assign(clientConfig, { endpoint });
        }

        return Object.keys(clientConfig).length > 0 ? clientConfig : {};
    }

    private static registerClient(client: IoTClient, contextName: string): void {
        IotClientFactory.clients[contextName] = client;
    }
}
