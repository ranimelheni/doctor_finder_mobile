
import bcrypt 
  
# example password 
password = input()
  
# converting password to array of bytes 
bytes = password.encode('utf-8') 
  
# generating the salt 
salt = bcrypt.gensalt() 
  
# Hashing the password 
hash = bcrypt.hashpw(bytes, salt) 
  
print(hash)