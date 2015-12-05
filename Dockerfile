FROM library/rethinkdb:2.2.1

ENV RETHINKDB_CONFIG rethinkdb_cluster.conf

# install packages
RUN apt-get update
RUN apt-get install -y npm curl

# install node
RUN npm install -g n
RUN n 0.10.38

# create /app and add files
WORKDIR /app
ADD . /app

# install dependencies
RUN npm install

# expose ports
EXPOSE 8080 28015 29015

# run
CMD node rethinkdb.js
