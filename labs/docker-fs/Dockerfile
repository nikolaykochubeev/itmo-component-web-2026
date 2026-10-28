FROM node:22-alpine
WORKDIR /app
COPY package.json student.json index.mjs ./
COPY src ./src
# Refuse an unsigned submission image. Configure the real ISU before docker build.
RUN node --input-type=module -e "import {readFileSync} from 'node:fs'; import {formatResult} from './src/analyze.mjs'; formatResult(JSON.parse(readFileSync('student.json','utf8')).isu,{files:0,directories:0,size:0n})"
CMD ["node", "index.mjs"]
