# scp files to remote
scp -i ~/.ssh/relative-pointing-key.pem build ubuntu@18.118.81.244:/opt/whatever/relative-pointing/
# restart service
ssh -i ~/.ssh/relative-pointing-key.pem ubuntu@18.118.81.224 -c "ls /opt"
# restart nginx
