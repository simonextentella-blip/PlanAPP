import { LocaleConfig } from 'react-native-calendars';
import { DAY_NAMES, DAY_SHORT, MONTH_NAMES, MONTH_SHORT } from './dates';

LocaleConfig.locales.it = {
  monthNames: MONTH_NAMES,
  monthNamesShort: MONTH_SHORT,
  dayNames: DAY_NAMES,
  dayNamesShort: DAY_SHORT,
  today: 'Oggi',
};
LocaleConfig.defaultLocale = 'it';
