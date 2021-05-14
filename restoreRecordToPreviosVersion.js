const fulcrum = require('fulcrum-app');
const { prompt, confirm, Select } = require('enquirer');
const Client = fulcrum.Client;
const createAuthorization = fulcrum.createAuthorization;
const getUser = fulcrum.getUser;

const getToken = (username, password, organizationId) => {
    createAuthorization(username, password, organizationId, 'restoreRecord', 3600)
        .then((authorization) => {
            recordRestore(authorization.token);
        })
        .catch((error) => {
            console.log(error.message);
        });
}


const getOrg = (username, password) => {
    getUser(username, password)
        .then((user) => {
            // user.contexts is an array of the organizations you belong to. Use These
            // ids with createAuthorization to create API tokens.

            let orgNames = user.contexts.map(context => {
                return context.name
            });

            if (user.contexts.length > 1) {
                const prompt = new Select({
                    name: 'color',
                    message: 'Select and org',
                    choices: orgNames
                });

                prompt.run()
                    .then(answer => {
                        let org = user.contexts.filter(context => {
                            return context.name === answer
                        })
                        getToken(username, password, org[0].id)
                    })
                    .catch(console.error);

                return 'not yet'
            } else {
                getToken(user, pass, user.contexts[0].id)
            }

        })
        .catch((error) => {
            console.log(error.message);
        });
}

const login = async () => {

    const credentials = await prompt(
        [
            {
                type: 'input',
                name: 'username',
                message: 'What is your Fulcrum username?'
            },
            {
                type: 'password',
                name: 'password',
                message: 'What is your Fulcrum password?'
            }
        ]
    );

    getOrg(credentials.username, credentials.password)

}

login()

const recordRestore = async (token) => {
    const fulcrum = new Client(token);

    const input = await prompt(
        [
            {
                type: 'input',
                name: 'id',
                message: 'Enter the record ID you want to manipulate.'
            },
            {
                type: 'input',
                name: 'version',
                message: 'Enter the version you want to restore to. (be careful what you wish for)'
            }
        ]
    );

    getPreviousVersion(input.id, input.version)

    function getPreviousVersion(id, version) {
        fulcrum.records.history(id)
            .then(async (page) => {
                const versions = page.objects.length;
                let previousVersion = page.objects[version - 1];

                delete previousVersion.version;
                delete previousVersion.history_change_type;
                delete previousVersion.history_id;
                delete previousVersion.history_changed_by_id;
                delete previousVersion.history_changed_by;
                delete previousVersion.history_created_at;

                // console.log(JSON.stringify(previousVersion, null, 4));

                const confirmation = await confirm({
                    name: 'continue',
                    message: 'Are you absolutely sure you want to restore the record to the version printed out above?'
                });
                if (confirmation == true) {
                    console.log('ok updating the record - i sure hope you know what you are doing... stand by')
                    updateRecord(id, previousVersion);
                } else {
                    goAgain(token)
                }

                function updateRecord(id, previousVersion) {
                    fulcrum.records.update(id, previousVersion)
                        .then((record) => {
                            console.log(record.id + ' has been updated!');
                            goAgain(token)
                        })
                        .catch((error) => {
                            console.log(error.message);
                        });
                }
            })

            .catch((error) => {
                console.log(error.message);
            });
    }
}

const goAgain = async (token) => {
    const goOrStay = await confirm({
        name: 'continue',
        message: 'Want to do another?'
    });
    if (goOrStay == true) {
        console.log('weeeee')
        recordRestore(token)
    } else {
        console.log('later gator')
    }
}