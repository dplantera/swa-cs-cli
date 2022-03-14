import {start} from "./Application";

start()
    .then(res => console.log(`app shutting down: ${res}`))
    .catch(err => console.log(err))