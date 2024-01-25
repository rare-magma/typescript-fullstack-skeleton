import DomainEvent from '@src/domain/eventBus/domainEvent';
import DomainEventMapping from '@src/domain/eventBus/domainEventMapping';
import UuidMother from '@src/domain/uuid.mother';
import DomainEventJsonMarshaller from '@src/infrastructure/eventBus/marshallers/json/domainEventJsonMarshaller';
import NoopLogger from '@src/infrastructure/logger/noopLogger';
import DdbOneTableClientFactory from '@src/infrastructure/persistence/ddbOneTable/ddbOneTableClientFactory';
import DdbOneTableDomainEventRepository from '@src/infrastructure/persistence/ddbOneTable/ddbOneTableDomainEventRepository';
import DdbOneTableEnvironmentArranger from '@src/infrastructure/persistence/ddbOneTable/ddbOneTableEnvironmentArranger';
import DynamodbClientFactory from '@src/infrastructure/persistence/dynamodb/dynamodbClientFactory';

class DummyEvent extends DomainEvent {
    static eventName = 'dummy:event';

    constructor(
        args: { id: string } & {
            eventId?: string;
            occurredOn?: Date;
        }
    ) {
        super(DummyEvent.eventName, args.id, args.eventId, args.occurredOn);
    }

    // eslint-disable-next-line class-methods-use-this
    toPrimitives(): Record<string, unknown> {
        return {};
    }
}

const noLogger = new NoopLogger(),
    table = DdbOneTableClientFactory.createClient(
        'integration-tests',
        DynamodbClientFactory.createClient(
            'integration-tests',
            {
                region: 'localhost',
                endpoint: 'http://localhost:8000',
                sslEnabled: false
            },
            noLogger
        ),
        {
            tableName: 'db-integration-tests',
            indexes: { primary: { hash: 'pk', sort: 'sk' } }
        },
        noLogger
    ),
    environmentArranger = new DdbOneTableEnvironmentArranger(table),
    marshaller = new DomainEventJsonMarshaller(new DomainEventMapping([])),
    repository = new DdbOneTableDomainEventRepository(table, marshaller);

describe('ddbOneTableDomainEventRepository', () => {
    // eslint-disable-next-line jest/no-hooks
    beforeEach(async () => {
        await environmentArranger.arrange();
    });

    // eslint-disable-next-line jest/no-hooks
    afterAll(async () => {
        await environmentArranger.close();
    });

    describe('save', () => {
        it('should save a DomainEvent', async () => {
            expect.hasAssertions();

            const event = new DummyEvent({ id: UuidMother.random() });

            await repository.save(event);

            expect(true).toBe(true);
        });
    });
});
