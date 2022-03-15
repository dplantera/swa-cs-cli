type TimeRangeString = {
  start: string;
  end: string;
};

export type Booking = {
  id: string;
  provId: string;
  timeRange: TimeRangeString;
  bookeeId?: string;
  customerId?: string;
  bookingTypes: [];
  price?: {
    priceItems: [];
    bookingId: string;
    timeRange: TimeRangeString;
    id: string;
  };
  addProps?: [];
  changeable: boolean;
  cancelled: boolean;
  billingState: 'DELIVERED' | 'NOT_DELIVERED';
  distance: number;
  entrances?: [];
  rideShareAllowed: boolean;
};

export type Credentials = {
  username: string;
  password: string;
  apiKey: string;
};
export type TimeRange = { start: Date; end: Date };
