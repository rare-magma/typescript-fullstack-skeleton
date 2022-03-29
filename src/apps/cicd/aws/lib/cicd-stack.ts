/* eslint-disable import/prefer-default-export */
import { CfnParameter, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Secret, SecretStringValueBeta1 } from 'aws-cdk-lib/aws-secretsmanager';
import {
    PipelineProject, BuildSpec, LinuxBuildImage, BuildEnvironmentVariableType
} from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeStarConnectionsSourceAction, CodeBuildAction, Action } from 'aws-cdk-lib/aws-codepipeline-actions';
import { CfnConnection } from 'aws-cdk-lib/aws-codestarconnections';

export class CICDStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const sourceProvider = this.node.tryGetContext('provider'),
            repository = this.node.tryGetContext('repository'),
            dockerSecret = this.buildDockerhubSecret();

        this.buildCICDPipeline(sourceProvider, repository, dockerSecret);
    }

    private buildDockerhubSecret(): Secret {
        const dockerhubUser = new CfnParameter(this, 'DockerhubUsername', {
                type: 'String',
                description: 'Username to be used to log in dockerhub to pull docker images.'
            }),
            dockerhubPass = new CfnParameter(this, 'DockerhubPassword', {
                type: 'String',
                description: 'Password to be used to log in dockerhub to pull docker images.',
                noEcho: true
            }),
            secretStr = JSON.stringify({ username: dockerhubUser.valueAsString, password: dockerhubPass.valueAsString });

        return new Secret(this, 'DockerHubSecret', {
            secretStringBeta1: SecretStringValueBeta1.fromToken(secretStr)
        });
    }

    private buildCICDPipeline(sourceProvider: 'Bitbucket' | 'GitHub', repository: string, dockerSecret: Secret) {
        const [sourceAction, sourceOutput] = this.buildSourceAction(sourceProvider, repository),
            [testAction, testOutput] = this.buildTestAction(sourceOutput, dockerSecret),
            [deployAction] = this.buildDeployAction(testOutput);

        // eslint-disable-next-line no-new
        new Pipeline(this, 'Pipeline', {
            crossAccountKeys: false,
            restartExecutionOnUpdate: true,
            stages: [
                {
                    stageName: 'Source',
                    actions: [sourceAction]
                },
                {
                    stageName: 'TestBuild',
                    actions: [testAction]
                },
                {
                    stageName: 'BuildDeploy',
                    actions: [deployAction]
                }
            ]
        });
    }

    private buildSourceAction(sourceProvider: 'Bitbucket' | 'GitHub', repository: string): [Action, Artifact] {
        const connection = new CfnConnection(this, 'ConnectionToRepository', {
                connectionName: `${sourceProvider}`,
                providerType: sourceProvider
            }),
            [owner, repositoryAndBranch] = repository.split('/'),
            [repo, branch] = repositoryAndBranch.split('#'),
            output = new Artifact(),
            action = new CodeStarConnectionsSourceAction({
                actionName: 'SourceAction',
                owner,
                repo,
                branch,
                output,
                connectionArn: connection.ref
            });

        return [action, output];
    }

    private buildTestAction(sourceOutput: Artifact, dockerSecret: Secret): [Action, Artifact] {
        const project = new PipelineProject(this, 'TestBuild', {
                environment: {
                    buildImage: LinuxBuildImage.STANDARD_5_0,
                    privileged: true
                },
                environmentVariables: {
                    SECRET_ID: {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: dockerSecret.secretArn
                    }
                }
            }),
            output = new Artifact(),
            action = new CodeBuildAction({
                actionName: 'Test-Build',
                project,
                input: sourceOutput,
                outputs: [output]
            });

        dockerSecret.grantRead(project);

        return [action, output];
    }

    private buildDeployAction(testOutput: Artifact): [Action, Artifact] {
        const project = new PipelineProject(this, 'BuildDeploy', {
                buildSpec: BuildSpec.fromObject({
                    version: '0.2',
                    phases: {
                        install: {
                            'runtime-versions': {
                                nodejs: '14.x'
                            }
                        },
                        build: {
                            commands: ['bash deploy.sh']
                        }
                    }
                }),
                environment: {
                    buildImage: LinuxBuildImage.STANDARD_5_0
                }
            }),
            output = new Artifact(),
            action = new CodeBuildAction({
                actionName: 'Build-Deploy',
                project,
                input: testOutput,
                outputs: [output]
            });

        return [action, output];
    }
}