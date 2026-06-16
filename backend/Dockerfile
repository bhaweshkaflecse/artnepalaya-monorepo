FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# npm ci requires package-lock.json to be in sync with package.json.
# expo-server-sdk was added to package.json without updating the lockfile.
# Fall back to npm install if the lockfile is out of sync.
# Once the lockfile is regenerated (see LOCKFILE_FIX.md), revert to just: RUN npm ci --only=production
RUN npm ci --only=production || npm install --only=production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]