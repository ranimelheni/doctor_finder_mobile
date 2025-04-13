USE doctors_db;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS messages;

-- Create doctors table
CREATE TABLE doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    specialty VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    image VARCHAR(200),
    gender ENUM('Male', 'Female'),
    address VARCHAR(255),
    phone VARCHAR(20)
);

-- Create users table with is_doctor and doctor_id
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_doctor BOOLEAN DEFAULT FALSE,
    doctor_id INT,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- Create appointments table
CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATETIME NOT NULL,
    status ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled') DEFAULT 'Pending',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- Create favorites table
CREATE TABLE favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    doctor_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    UNIQUE KEY unique_favorite (user_id, doctor_id) -- Prevent duplicate favorites
);
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message_text TEXT NOT NULL,
    type ENUM('message', 'attachment') NOT NULL DEFAULT 'message',
    extension VARCHAR(10) DEFAULT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message VARCHAR(200) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('note', 'file') NOT NULL,
    description TEXT NOT NULL,
    content TEXT NOT NULL,
    appid INT NOT NULL,
    extension VARCHAR(10) NULL
);
CREATE TABLE documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    doctor_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    content TEXT NOT NULL, 
    extension VARCHAR(10), 
    viewed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);
CREATE TABLE document_notes (
    id INTEGER AUTO_INCREMENT PRIMARY KEY ,
    document_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);
-- Insert 50 doctors into doctors table
INSERT INTO doctors (name, specialty, city, gender, address, phone) VALUES
('Dr. Ahmed Ben Salah', 'Cardiology', 'Tunis', 'Male', '123 Avenue Habib Bourguiba', '216-71-123-456'),
('Dr. Leila Khelifi', 'Pediatrics', 'Sousse', 'Female', '45 Rue de la Liberte', '216-73-789-012'),
('Dr. Mohamed Trabelsi', 'Orthopedics', 'Sfax', 'Male', '78 Boulevard 7 Novembre', '216-74-345-678'),
('Dr. Fatma Zouaoui', 'Dermatology', 'Bizerte', 'Female', '12 Rue du Port', '216-72-567-890'),
('Dr. Khaled Jendoubi', 'Neurology', 'Kairouan', 'Male', '34 Avenue Ali Belhouane', '216-77-901-234'),
('Dr. Amina Hassen', 'Gynecology', 'Gafsa', 'Female', '56 Rue de la Republique', '216-76-123-456'),
('Dr. Sami Gharbi', 'General Surgery', 'Gabès', 'Male', '89 Avenue Farhat Hached', '216-75-789-012'),
('Dr. Nadia Chaabane', 'Ophthalmology', 'Monastir', 'Female', '23 Rue de l’Independance', '216-73-345-678'),
('Dr. Hichem Belhadj', 'Urology', 'Nabeul', 'Male', '67 Avenue Habib Thameur', '216-72-901-234'),
('Dr. Rania Saidi', 'Psychiatry', 'Ariana', 'Female', '45 Rue du 7 Novembre', '216-71-567-890'),
('Dr. Youssef Mansouri', 'Endocrinology', 'Sidi Bouzid', 'Male', '12 Avenue de la Liberte', '216-76-789-012'),
('Dr. Imen Ben Ammar', 'Radiology', 'Mahdia', 'Female', '78 Rue Ibn Khaldoun', '216-73-123-456'),
('Dr. Fathi Jelassi', 'Oncology', 'Kasserine', 'Male', '34 Avenue de Carthage', '216-77-345-678'),
('Dr. Salma Mhiri', 'Rheumatology', 'Jendouba', 'Female', '56 Rue de Tunis', '216-78-901-234'),
('Dr. Omar Cherif', 'Pulmonology', 'Zaghouan', 'Male', '23 Rue du 1er Juin', '216-72-567-890'),
('Dr. Hanen Gueddana', 'ENT', 'Tozeur', 'Female', '89 Avenue Bourguiba', '216-76-123-456'),
('Dr. Tarek Ben Jemaa', 'Gastroenterology', 'Kebili', 'Male', '12 Rue de la Republique', '216-75-789-012'),
('Dr. Asma Dhaouadi', 'Nephrology', 'Siliana', 'Female', '45 Avenue Ali Belhouane', '216-78-345-678'),
('Dr. Nizar Hamdi', 'Hematology', 'Béja', 'Male', '67 Rue Farhat Hached', '216-78-901-234'),
('Dr. Sonia Ben Romdhane', 'Infectious Diseases', 'Le Kef', 'Female', '23 Avenue de la Liberte', '216-78-567-890'),
('Dr. Anis Bouraoui', 'Anesthesiology', 'Medenine', 'Male', '56 Rue du 7 Novembre', '216-75-123-456'),
('Dr. Wafa Karray', 'Pathology', 'Tataouine', 'Female', '78 Avenue Habib Thameur', '216-75-789-012'),
('Dr. Mehdi Feki', 'Plastic Surgery', 'Ben Arous', 'Male', '34 Rue Ibn Khaldoun', '216-71-345-678'),
('Dr. Amel Gharbi', 'Internal Medicine', 'Manouba', 'Female', '12 Avenue de Carthage', '216-71-901-234'),
('Dr. Kais Maalej', 'Neurosurgery', 'Hammamet', 'Male', '45 Rue de Tunis', '216-72-567-890'),
('Dr. Zied Baccouche', 'Cardiology', 'La Marsa', 'Male', '67 Avenue Bourguiba', '216-71-123-456'),
('Dr. Nour El Houda', 'Pediatrics', 'Kélibia', 'Female', '23 Rue de la Republique', '216-72-789-012'),
('Dr. Hatem Gharbi', 'Orthopedics', 'El Jem', 'Male', '89 Avenue Ali Belhouane', '216-73-345-678'),
('Dr. Ines Trabelsi', 'Dermatology', 'Djerba', 'Female', '12 Rue Farhat Hached', '216-75-901-234'),
('Dr. Riadh Ben Youssef', 'Neurology', 'Skanes', 'Male', '34 Avenue de la Liberte', '216-73-567-890'),
('Dr. Chaima Lassoued', 'Gynecology', 'Mateur', 'Female', '56 Rue du 7 Novembre', '216-72-123-456'),
('Dr. Lotfi Chouchane', 'General Surgery', 'Korba', 'Male', '78 Avenue Habib Thameur', '216-72-789-012'),
('Dr. Hajer Ben Said', 'Ophthalmology', 'Zarzis', 'Female', '23 Rue Ibn Khaldoun', '216-75-345-678'),
('Dr. Walid Ghedira', 'Urology', 'Tabarka', 'Male', '45 Avenue de Carthage', '216-78-901-234'),
('Dr. Marwa Ben Ali', 'Psychiatry', 'El Kef', 'Female', '67 Rue de Tunis', '216-78-567-890'),
('Dr. Adel Boughattas', 'Endocrinology', 'Douz', 'Male', '12 Avenue Bourguiba', '216-75-123-456'),
('Dr. Sarra Jemni', 'Radiology', 'Sbeitla', 'Female', '34 Rue de la Republique', '216-76-789-012'),
('Dr. Bilel Kamoun', 'Oncology', 'Ghardimaou', 'Male', '56 Avenue Ali Belhouane', '216-78-345-678'),
('Dr. Rim Ben Fredj', 'Rheumatology', 'Chebba', 'Female', '78 Rue Farhat Hached', '216-73-901-234'),
('Dr. Sofiene Ayadi', 'Pulmonology', 'Menzel Bourguiba', 'Male', '23 Avenue de la Liberte', '216-72-567-890'),
('Dr. Olfa Jmaa', 'ENT', 'Houmt Souk', 'Female', '89 Rue du 7 Novembre', '216-75-123-456'),
('Dr. Karim Zaouche', 'Gastroenterology', 'Nefta', 'Male', '12 Avenue Habib Thameur', '216-76-789-012'),
('Dr. Lilia Ben Hassine', 'Nephrology', 'Soliman', 'Female', '34 Rue Ibn Khaldoun', '216-72-345-678'),
('Dr. Hedi Gharbi', 'Hematology', 'Ksour Essef', 'Male', '56 Avenue de Carthage', '216-73-901-234'),
('Dr. Emna Sfaxi', 'Infectious Diseases', 'Rades', 'Female', '78 Rue de Tunis', '216-71-567-890'),
('Dr. Jamel Eddine', 'Anesthesiology', 'El Haouaria', 'Male', '23 Avenue Bourguiba', '216-72-123-456'),
('Dr. Sana Khemiri', 'Pathology', 'Metline', 'Female', '45 Rue de la Republique', '216-78-789-012'),
('Dr. Fares Ben Miled', 'Plastic Surgery', 'Ezzahra', 'Male', '67 Avenue Ali Belhouane', '216-71-345-678'),
('Dr. Nesrine Gharbi', 'Internal Medicine', 'Fouchana', 'Female', '12 Rue Farhat Hached', '216-71-901-234'),
('Dr. Kamel Ben Romdhane', 'Neurosurgery', 'Bardo', 'Male', '34 Avenue de la Liberte', '216-71-567-890');

-- Insert matching users with doctor_id
INSERT INTO users (first_name, last_name, email, password, is_doctor, doctor_id) VALUES
('Ahmed', 'Ben Salah', 'ahmed.bensalah@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 1),
('Leila', 'Khelifi', 'leila.khelifi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 2),
('Mohamed', 'Trabelsi', 'mohamed.trabelsi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 3),
('Fatma', 'Zouaoui', 'fatma.zouaoui@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 4),
('Khaled', 'Jendoubi', 'khaled.jendoubi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 5),
('Amina', 'Hassen', 'amina.hassen@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 6),
('Sami', 'Gharbi', 'sami.gharbi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 7),
('Nadia', 'Chaabane', 'nadia.chaabane@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 8),
('Hichem', 'Belhadj', 'hichem.belhadj@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 9),
('Rania', 'Saidi', 'rania.saidi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 10),
('Youssef', 'Mansouri', 'youssef.mansouri@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 11),
('Imen', 'Ben Ammar', 'imen.benammar@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 12),
('Fathi', 'Jelassi', 'fathi.jelassi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 13),
('Salma', 'Mhiri', 'salma.mhiri@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 14),
('Omar', 'Cherif', 'omar.cherif@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 15),
('Hanen', 'Gueddana', 'hanen.gueddana@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 16),
('Tarek', 'Ben Jemaa', 'tarek.benjemaa@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 17),
('Asma', 'Dhaouadi', 'asma.dhaouadi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 18),
('Nizar', 'Hamdi', 'nizar.hamdi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 19),
('Sonia', 'Ben Romdhane', 'sonia.benromdhane@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 20),
('Anis', 'Bouraoui', 'anis.bouraoui@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 21),
('Wafa', 'Karray', 'wafa.karray@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 22),
('Mehdi', 'Feki', 'mehdi.feki@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 23),
('Amel', 'Gharbi', 'amel.gharbi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 24),
('Kais', 'Maalej', 'kais.maalej@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 25),
('Zied', 'Baccouche', 'zied.baccouche@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 26),
('Nour', 'El Houda', 'nour.elhouda@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 27),
('Hatem', 'Gharbi', 'hatem.gharbi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 28),
('Ines', 'Trabelsi', 'ines.trabelsi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 29),
('Riadh', 'Ben Youssef', 'riadh.benyoussef@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 30),
('Chaima', 'Lassoued', 'chaima.lassoued@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 31),
('Lotfi', 'Chouchane', 'lotfi.chouchane@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 32),
('Hajer', 'Ben Said', 'hajer.bensaid@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 33),
('Walid', 'Ghedira', 'walid.ghedira@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 34),
('Marwa', 'Ben Ali', 'marwa.benali@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 35),
('Adel', 'Boughattas', 'adel.boughattas@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 36),
('Sarra', 'Jemni', 'sarra.jemni@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 37),
('Bilel', 'Kamoun', 'bilel.kamoun@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 38),
('Rim', 'Ben Fredj', 'rim.benfredj@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 39),
('Sofiene', 'Ayadi', 'sofiene.ayadi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 40),
('Olfa', 'Jmaa', 'olfa.jmaa@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 41),
('Karim', 'Zaouche', 'karim.zaouche@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 42),
('Lilia', 'Ben Hassine', 'lilia.benhassine@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 43),
('Hedi', 'Gharbi', 'hedi.gharbi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 44),
('Emna', 'Sfaxi', 'emna.sfaxi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 45),
('Jamel', 'Eddine', 'jamel.eddine@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 46),
('Sana', 'Khemiri', 'sana.khemiri@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 47),
('Fares', 'Ben Miled', 'fares.benmiled@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 48),
('Nesrine', 'Gharbi', 'nesrine.gharbi@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 49),
('Kamel', 'Ben Romdhane', 'kamel.benromdhane@example.com', '$2b$12$FjE4Ff6JIX6b7HHIzEhupe/13hd1z28YjLVtw0t.rJZq.r39iGsXW', TRUE, 50);
