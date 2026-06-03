pipeline {
    agent any

    environment {
        DOCKER_HOST_IP = "16.170.223.95"
        DOCKER_USER = "ubuntu"
        DOCKER_APP_DIR = "civil-cost-estimation"
        DOCKER_IMAGE = "civil-cost-estimation-app"
        DOCKER_CONTAINER = "civil-cost-estimation-container"
        RECIPIENTS = "02fe23bcs403@kletech.ac.in,mmohammadfurkhan@gmail.com,02fe23bcs411@kletech.ac.in"
    }

    stages {
        stage('Clone Repository') {
            steps {
                git branch: 'main', url: 'https://github.com/mohammadfurkanmunavalli/civil-cost-estimation.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'ec2-ssh-key', keyFileVariable: 'KEY'),
                    string(credentialsId: 'vite-supabase-url', variable: 'VITE_SUPABASE_URL'),
                    string(credentialsId: 'vite-supabase-anon-key', variable: 'VITE_SUPABASE_ANON_KEY')
                ]) {
                    sh """
                        ssh -i \$KEY -o StrictHostKeyChecking=no ${DOCKER_USER}@${DOCKER_HOST_IP} '
                            rm -rf ${DOCKER_APP_DIR} && mkdir -p ${DOCKER_APP_DIR}
                        '

                        scp -i \$KEY -o StrictHostKeyChecking=no -r \
                            src demo-data images-to-upload supabase \
                            Dockerfile package.json package-lock.json \
                            index.html vite.config.ts tsconfig.json \
                            tailwind.config.ts postcss.config.js \
                            ${DOCKER_USER}@${DOCKER_HOST_IP}:${DOCKER_APP_DIR}/

                        ssh -i \$KEY -o StrictHostKeyChecking=no ${DOCKER_USER}@${DOCKER_HOST_IP} '
                            cd ${DOCKER_APP_DIR} &&
                            docker build \
                                --build-arg VITE_SUPABASE_URL='"\$VITE_SUPABASE_URL"' \
                                --build-arg VITE_SUPABASE_ANON_KEY='"\$VITE_SUPABASE_ANON_KEY"' \
                                -t ${DOCKER_IMAGE} .
                        '
                    """
                }
            }
        }

        stage('Run Container') {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'ec2-ssh-key', keyFileVariable: 'KEY')]) {
                    sh """
                        ssh -i \$KEY -o StrictHostKeyChecking=no ${DOCKER_USER}@${DOCKER_HOST_IP} '
                            docker rm -f ${DOCKER_CONTAINER} || true &&
                            docker run -d -p 3000:3000 --name ${DOCKER_CONTAINER} ${DOCKER_IMAGE}
                        '
                    """
                }
            }
        }

        stage('Selenium Tests') {
            steps {
                sh """
                    echo "Running Selenium tests..."
                    # TODO: Add your Selenium test command here
                """
            }
        }
    }

    post {
        success {
            emailext(
                subject: "Build Successful: ${env.JOB_NAME} [#${env.BUILD_NUMBER}]",
                body: """Great news!

Build #${env.BUILD_NUMBER} of job '${env.JOB_NAME}' succeeded.

Application URL: http://${env.DOCKER_HOST_IP}:3000
View build: ${env.BUILD_URL}""",
                to: "${env.RECIPIENTS}"
            )
        }

        failure {
            emailext(
                subject: "Build Failed: ${env.JOB_NAME} [#${env.BUILD_NUMBER}]",
                body: """Build #${env.BUILD_NUMBER} of job '${env.JOB_NAME}' failed.

View build: ${env.BUILD_URL}""",
                to: "${env.RECIPIENTS}"
            )
        }
    }
}
