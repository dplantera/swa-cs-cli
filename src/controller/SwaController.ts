import {SwaService} from "../services/SwaService";

export class SwaController {
    constructor(private readonly service: SwaService) {

    }

    getData() {
        return this.service.getDataFromCache()
    }

    getRefreshed() {
        return this.service.getRefreshedData()
    }

    async getStats() {
        const totals = await this.service.getTotalLastYear();
        const remaining = this.service.getRemaining(totals);
        const prospectiveCosts = this.service.getProspectiveCosts(remaining);
        return {
            totals, remaining, prospectiveCosts
        }
    }
}