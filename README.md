# MTGO Scraper

## Install & run

Make sure you have npm and yarn installed. Install dependencies with:

```bash
yarn
```

Once it's done scrape today's events with:

```bash
yarn start
```

To backdate to today:

```bash
yarn start 2014-05-07
```

To backdate between a range:

```bash
yarn start 2014-05-07 2014-05-21
```

To startup a local database:

```bash
yarn start-database
```
