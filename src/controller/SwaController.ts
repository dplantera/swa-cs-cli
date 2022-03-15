import { DateRange, SwaService } from '../services/SwaService';
import { Credentials } from '../clients/SwaClient.types';

export class SwaController {
  constructor(private readonly service: SwaService) {}

  login(auth: Credentials) {
    this.service.login(auth);
  }

  getData(range: DateRange) {
    return this.service.getDataFromCache({ dateRange: range });
  }

  getRefreshed(range: DateRange) {
    return this.service.getRefreshedData(range);
  }

  async getStats(range: DateRange) {
    const totals = await this.service.getTotals(range);
    const remaining = this.service.getRemaining(totals);
    const prospectiveCosts = this.service.getProspectiveCosts(remaining);
    return {
      totals,
      remaining,
      prospectiveCosts,
    };
  }
}
