<div align="center">

<h1>Wallet-ui</h1>
<span>by </span><a href="https://in2.es">in2.es</a>
<p><p>


[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=in2workspace_in2-wallet-ui&metric=alert_status)](https://sonarcloud.io/dashboard?id=in2workspace_in2-wallet-ui)

[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=in2workspace_in2-wallet-ui&metric=bugs)](https://sonarcloud.io/summary/new_code?id=in2workspace_in2-wallet-ui)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=in2workspace_in2-wallet-ui&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=in2workspace_in2-wallet-ui)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=in2workspace_in2-wallet-ui&metric=security_rating)](https://sonarcloud.io/dashboard?id=in2workspace_in2-wallet-ui)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=in2workspace_in2-wallet-ui&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=in2workspace_in2-wallet-ui)
[![Lines of Code](https://sonarcloud.io/api/project_badges/measure?project=in2workspace_in2-wallet-ui&metric=ncloc)](https://sonarcloud.io/dashboard?id=in2workspace_in2-wallet-ui)

[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=in2workspace_in2-wallet-ui&metric=coverage)](https://sonarcloud.io/summary/new_code?id=in2workspace_in2-wallet-ui)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=in2workspace_in2-wallet-ui&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=in2workspace_in2-wallet-ui)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=in2workspace_in2-wallet-ui&metric=reliability_rating)](https://sonarcloud.io/dashboard?id=in2workspace_in2-wallet-ui)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=in2workspace_in2-wallet-ui&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=in2workspace_in2-wallet-ui)
[![Technical Debt](https://sonarcloud.io/api/project_badges/measure?project=in2workspace_in2-wallet-ui&metric=sqale_index)](https://sonarcloud.io/summary/new_code?id=in2workspace_in2-wallet-ui)

</div>

# Introduction 
Altia EUDIStack Wallet Core UI is the presentation side application for the Altia EUDIStack Wallet project. It is an Ionic Angular application. 

## Architecture
The application is based on the following architecture:
### Wallet Driving Application (WDA)

## Main Features
// TODO: Add the main features of the application
- User login
- User logout
- User QR Scaning
- User Verifiable Presentation
- User Verifiable Credentials management
- User Prefered Language management
- User Prefered Scanning Camera management

# Getting Started
This aplication is developed, builded and tested in Visual Studio Code 
1. Clone the repository:
```git clone https://github.com/in2workspace/in2-wallet-wda.git```
2. Install dependencies:
```npm install```
3. Install Ionic
```npm install -g @ionic/cli```
4. Start aplication in local development
```npm start```
5. Build docker image
```docker build -t wallet-wda .```
6. Run docker image
```docker run -p 4200:8088 -e WCA_URL=http://yourdomain.com -e LOGIN_URL=http://yourdomain.com wallet-driving-application```
# Customization



# Build and Test
We have 3 different ways to build and test the project depending on the selected Spring Boot profile.
- `test` profile: This profile is used for unit testing. It uses an in-memory database and does not require any external dependencies.
- `local` profile: This profile is used for local development. It uses an in-memory database and generates default data to test the application. You need to run a set of docker containers to run the application (Orion Context Broker and MongoDb).
- `local-docker` profile: This profile is used for local development. It uses a dockerized database and generates default data to test the application.
- `dev` profile: This profile is used for development. It uses a dockerized database and generates default data to test the application.
- `docker` you can set environment variables dinamicaly using '-e WCA_URL=http://yourdomain.com' all the diferent environment variables are WCA_URL, DATA_URL, LOGIN_URL, REGISTER_URL, EXECCONT_URI, VP_URL, CRED_URI, CREDID_URI, USER_URI
# Contribute

# License

# Documentation
