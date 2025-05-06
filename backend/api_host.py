import base64
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import JWTManager, decode_token, jwt_required, create_access_token, get_jwt_identity
import logging
from sqlalchemy import distinct, func

logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Update database URI to PostgreSQL
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://neondb_owner:npg_yDgHEK8r9vXe@ep-ancient-bush-a87ccgy7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-secret-key-here'

db = SQLAlchemy(app)

# Models
class Doctor(db.Model):
    __tablename__ = 'doctors'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    specialty = db.Column(db.String(50), nullable=False)
    city = db.Column(db.String(50), nullable=False)
    image = db.Column(db.String(200))
    gender = db.Column(db.Enum('Male', 'Female', name='gender_types'))
    address = db.Column(db.String(255))
    phone = db.Column(db.String(20))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'specialty': self.specialty,
            'city': self.city,
            'image': self.image or '',
            'gender': self.gender,
            'address': self.address or '',
            'phone': self.phone or ''
        }

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    is_doctor = db.Column(db.Boolean, default=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=True)
    doctor = db.relationship('Doctor', backref='user', uselist=False, lazy='joined') 

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'is_doctor': self.is_doctor,
            'doctor_id': self.doctor_id
        }

class Message(db.Model):
    __tablename__ = 'messages'
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message_text = db.Column(db.Text, nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)

class Appointment(db.Model):
    __tablename__ = 'appointments'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.Enum('Pending', 'Confirmed', 'Completed', 'Cancelled', name='appointment_status'))
    patient = db.relationship('User', backref='appointments', lazy='joined')
    doctor = db.relationship('Doctor', backref='appointments', lazy='joined')

    def to_dict(self, include_patient_name=False, include_doctor_name=False):
        base_dict = {
            'id': self.id,
            'user_id': self.user_id,
            'doctor_id': self.doctor_id,
            'appointment_date': self.appointment_date.isoformat(),
            'status': self.status,
            'patient_name': f"{self.patient.first_name} {self.patient.last_name}" if self.patient else 'Unknown'
        }
        if include_patient_name and self.patient:
            base_dict['patient_name'] = f"{self.patient.first_name} {self.patient.last_name}"
        if include_doctor_name and self.doctor:
            base_dict['doctor_name'] = self.doctor.name
        return base_dict

class Favorite(db.Model):
    __tablename__ = 'favorites'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'doctor_id': self.doctor_id
        }

class Attachment(db.Model):
    __tablename__ = 'attachments'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    type = db.Column(db.Enum('note', 'file', name='attachment_type'), nullable=False)
    description = db.Column(db.Text)
    content = db.Column(db.Text, nullable=False)
    appid = db.Column(db.Integer, db.ForeignKey('appointments.id'), nullable=False)
    extension = db.Column(db.String(10))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'description': self.description or '',
            'content': self.content,
            'appid': self.appid,
            'extension': self.extension or ''
        }

class Document(db.Model):
    __tablename__ = 'documents'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    content = db.Column(db.Text, nullable=False)
    extension = db.Column(db.String(10))
    viewed = db.Column(db.Boolean, default=False)
    doctor = db.relationship('Doctor', backref='documents', lazy='joined')
    user = db.relationship('User', backref='documents', lazy='select')
    notes = db.relationship('DocumentNote', backref='document', lazy='select')

    def to_dict(self, include_doctor_name=False):
        base_dict = {
            'id': self.id,
            'user_id': self.user_id,
            'doctor_id': self.doctor_id,
            'name': self.name,
            'description': self.description,
            'content': self.content,
            'extension': self.extension,
            'viewed': self.viewed,
            'user_name': f"{self.user.first_name} {self.user.last_name}",
            'notes': [note.to_dict() for note in self.notes]
        }
        if include_doctor_name and self.doctor:
            base_dict['doctor_name'] = self.doctor.name
        return base_dict

class DocumentNote(db.Model):
    __tablename__ = 'document_notes'
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'doctor_id': self.doctor_id,
            'content': self.content,
            'created_at': self.created_at.isoformat()
        }

class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'message': self.message,
            'created_at': self.created_at.isoformat(),
            'is_read': self.is_read
        }

with app.app_context():
    db.create_all()
    user = db.session.get(User, User.query.filter_by(email='john.doe@example.com').first().id if User.query.filter_by(email='john.doe@example.com').first() else None)
    if user and not user.password.startswith('$2b$'):
        user.password = bcrypt.generate_password_hash('password123').decode('utf-8')
        db.session.commit()
    elif not user:
        sample_user = User(
            first_name='John',
            last_name='Doe',
            email='john.doe@example.com',
            password=bcrypt.generate_password_hash('password123').decode('utf-8')
        )
        db.session.add(sample_user)
        db.session.commit()

def add_notification(user_id, message, related_message=None, sender_id=None, notification_type=None):
    notification = Notification(user_id=user_id, message=message)
    db.session.add(notification)
    db.session.commit()
    notification_data = notification.to_dict()
    if related_message:
        notification_data['related_message'] = related_message
    if sender_id:
        notification_data['sender_id'] = sender_id
    if notification_type:
        notification_data['notification_type'] = notification_type
    socketio.emit('new_notification', notification_data, room=str(user_id))
    return notification

@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('limit', 5, type=int)
    name = request.args.get('name', '')
    specialty = request.args.get('specialty', '')
    city = request.args.get('city', '')

    query = Doctor.query
    if name:
        query = query.filter(Doctor.name.ilike(f'%{name}%'))
    if specialty:
        query = query.filter(Doctor.specialty == specialty)
    if city:
        query = query.filter(Doctor.city == city)

    doctors = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        'doctors': [doctor.to_dict() for doctor in doctors.items],
        'total': doctors.total,
        'pages': doctors.pages,
        'page': doctors.page
    })

@app.route('/api/users/all', methods=['GET'])
@jwt_required()
def get_all_users():
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    if not user.is_doctor:
        return jsonify({'message': 'Unauthorized: Doctors only'}), 403

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('limit', 5, type=int)
    name = request.args.get('name', '')

    query = db.session.query(User).outerjoin(Doctor, User.doctor_id == Doctor.id)
    if name:
        query = query.filter(
            db.or_(
                User.first_name.ilike(f'%{name}%'),
                User.last_name.ilike(f'%{name}%'),
                db.func.concat(User.first_name, ' ', User.last_name).ilike(f'%{name}%')
            )
        )

    users = query.paginate(page=page, per_page=per_page, error_out=False)

    response = {
        'users': [{
            'user_id': u.id,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'is_doctor': u.is_doctor,
            'doctor_id': u.doctor_id,
            'specialty': u.doctor.specialty if u.is_doctor and u.doctor else None,
            'city': u.doctor.city if u.is_doctor and u.doctor else None,
            'gender': u.doctor.gender if u.is_doctor and u.doctor else None,
            'image': u.doctor.image if u.is_doctor and u.doctor else None,
            'address': u.doctor.address if u.is_doctor and u.doctor else None,
            'phone': u.doctor.phone if u.is_doctor and u.doctor else None
        } for u in users.items],
        'total': users.total,
        'pages': users.pages,
        'page': users.page
    }

    return jsonify(response), 200

@app.route('/api/doctors/<int:id>', methods=['GET'])
def get_doctor_by_id(id):
    doctor = db.session.get(Doctor, id)
    if doctor:
        return jsonify(doctor.to_dict())
    return jsonify({'message': 'Doctor not found'}), 404

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'message': 'Email and password are required'}), 400
    user = User.query.filter_by(email=email).first()
    if user and bcrypt.check_password_hash(user.password, password):
        access_token = create_access_token(identity=str(user.id))
        return jsonify({'message': 'Login successful', 'user': user.to_dict(), 'access_token': access_token}), 200
    return jsonify({'message': 'Invalid email or password'}), 401

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    password = data.get('password')
    if not all([first_name, last_name, email, password]):
        return jsonify({'message': 'All fields are required'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already registered'}), 409
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(first_name=first_name, last_name=last_name, email=email, password=hashed_password, is_doctor=False, doctor_id=None)
    db.session.add(new_user)
    db.session.commit()
    access_token = create_access_token(identity=str(new_user.id))
    return jsonify({'message': 'Registration successful', 'user': new_user.to_dict(), 'access_token': access_token}), 201

@app.route('/api/appointments', methods=['POST'])
@jwt_required()
def get_appointments():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    user_id = data.get('user_id')
    status = data.get('status')
    appointment_id = data.get('appointment_id')

    if not user_id or user_id != current_user_id:
        return jsonify({'message': 'Unauthorized or invalid user ID'}), 403
    
    if status:
        appointments = Appointment.query.filter_by(user_id=user_id, status=status)
        if appointment_id:
            appointment = appointments.filter_by(id=appointment_id).first()
            return jsonify(appointment.to_dict(include_doctor_name=True))
        return jsonify([appointment.to_dict(include_doctor_name=True) for appointment in appointments.all()])
    else:
        appointments = Appointment.query.filter(Appointment.user_id == user_id, Appointment.status != "Completed").all()
    return jsonify([appointment.to_dict() for appointment in appointments])

@app.route('/api/doctor-appointments', methods=['POST'])
@jwt_required()
def get_doctor_appointments():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    doctor_id = data.get('doctor_id')
    status = data.get('status')
    appointment_id = data.get('appointment_id')
    
    user = db.session.get(User, current_user_id)
    if not user or not user.is_doctor or user.doctor_id != doctor_id:
        return jsonify({'message': 'Unauthorized: You can only view your own appointments'}), 403

    query = Appointment.query.filter(Appointment.doctor_id == doctor_id, Appointment.status != "Cancelled")
    if appointment_id:
        appointment = query.filter_by(id=appointment_id).first()
        if not appointment:
            return jsonify({'message': 'Appointment not found'}), 404
        return jsonify(appointment.to_dict(include_patient_name=True)), 200
    else:
        if status:
            if status not in ['Pending', 'Confirmed', 'Completed', 'Cancelled']:
                return jsonify({'message': 'Invalid status value'}), 400
            query = query.filter_by(status=status)
        appointments = query.all()
        return jsonify([appointment.to_dict(include_patient_name=True) for appointment in appointments]), 200

@app.route('/api/doctor-available-slots', methods=['POST'])
@jwt_required()
def get_doctor_available_slots():
    data = request.get_json()
    doctor_id = data.get('doctor_id')
    week_start = datetime.strptime(data.get('week_start'), '%Y-%m-%d')
    
    if not doctor_id or not week_start:
        return jsonify({'message': 'doctor_id and week_start are required'}), 400

    week_end = week_start.replace(hour=23, minute=59, second=59) + timedelta(days=6)
    appointments = Appointment.query.filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date >= week_start,
        Appointment.appointment_date <= week_end
    ).all()

    slots = []
    for day_offset in range(7):
        day = week_start + timedelta(days=day_offset)
        for hour in range(8, 18):
            slot_time = day.replace(hour=hour, minute=0, second=0)
            is_booked = any(
                app.appointment_date.replace(minute=0, second=0) == slot_time
                for app in appointments
            )
            if not is_booked:
                slots.append({
                    'date': slot_time.isoformat(),
                    'hour': slot_time.strftime('%H:00')
                })

    return jsonify(slots)

@app.route('/api/appointments/delete', methods=['POST'])
@jwt_required()
def delete_appointment():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    appointment_id = data.get('appointment_id')

    if not appointment_id:
        return jsonify({'message': 'appointment_id is required'}), 400

    appointment = db.session.get(Appointment, appointment_id)
    if not appointment:
        return jsonify({'message': 'Appointment not found'}), 404

    if appointment.user_id != current_user_id:
        return jsonify({'message': 'Unauthorized: You can only delete your own appointments'}), 403

    doctor_user = User.query.filter_by(doctor_id=appointment.doctor_id, is_doctor=True).first()
    if doctor_user:
        user = db.session.get(User, current_user_id)
        doctor_message = f"Appointment canceled by {user.first_name} on {appointment.appointment_date.strftime('%Y-%m-%d %H:%M')}"
        add_notification(
            doctor_user.id, 
            doctor_message, 
            related_message=doctor_message, 
            sender_id=current_user_id,
            notification_type='appointment_canceled'
        )

    db.session.delete(appointment)
    db.session.commit()
    return jsonify({'message': 'Appointment deleted successfully'}), 200

@app.route('/api/appointments/book', methods=['POST'])
@jwt_required()
def book_appointment():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    doctor_id = data.get('doctor_id')
    appointment_date = datetime.strptime(data.get('appointment_date'), '%Y-%m-%d %H:%M')

    if not doctor_id or not appointment_date:
        return jsonify({'message': 'doctor_id and appointment_date are required'}), 400

    user = db.session.get(User, current_user_id)
    if user.is_doctor and user.doctor_id == doctor_id:
        return jsonify({'message': 'Doctors cannot book their own appointments'}), 403

    if Appointment.query.filter(Appointment.doctor_id==doctor_id, Appointment.appointment_date==appointment_date, Appointment.status !="Cancelled").first():
        return jsonify({'message': 'This time slot is already booked'}), 409

    new_appointment = Appointment(
        user_id=current_user_id,
        doctor_id=doctor_id,
        appointment_date=appointment_date,
        status='Pending'
    )
    db.session.add(new_appointment)
    db.session.commit()

    doctor_user = User.query.filter_by(doctor_id=doctor_id, is_doctor=True).first()
    if doctor_user:
        doctor_message = f"New appointment booked by {user.first_name} on {appointment_date.strftime('%Y-%m-%d %H:%M')}"
        add_notification(
            doctor_user.id, 
            doctor_message, 
            related_message=doctor_message, 
            sender_id=current_user_id,
            notification_type='appointment_booked'
        )

    doctor = db.session.get(Doctor, doctor_id)
    user_message = f"New appointment booked with Dr. {doctor.name} on {appointment_date.strftime('%Y-%m-%d %H:%M')}"
    add_notification(
        current_user_id, 
        user_message, 
        related_message=user_message, 
        sender_id=doctor_user.id if doctor_user else None, 
        notification_type='appointment_booked'
    )

    return jsonify({'message': 'Appointment booked successfully', 'appointment': new_appointment.to_dict()}), 201

@app.route('/api/favorites', methods=['POST'])
@jwt_required()
def get_favorites():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    user_id = data.get('user_id')
    if not user_id or user_id != current_user_id:
        return jsonify({'message': 'Unauthorized or invalid user ID'}), 403
    favorites = Favorite.query.filter_by(user_id=user_id).all()
    result = []
    for favorite in favorites:
        doctor = db.session.get(Doctor, favorite.doctor_id)
        if doctor:
            result.append(doctor.to_dict())
    return jsonify(result)

@app.route('/api/profile', methods=['POST'])
@jwt_required()
def get_profile():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    user_id = data.get('user_id')
    
    requesting_user = db.session.get(User, current_user_id)
    if not requesting_user:
        return jsonify({'message': 'Requesting user not found'}), 404

    if not user_id or user_id == current_user_id:
        return jsonify({
            'id': requesting_user.id,
            'first_name': requesting_user.first_name,
            'last_name': requesting_user.last_name,
            'email': requesting_user.email,
            'is_doctor': requesting_user.is_doctor,
            'doctor_id': requesting_user.doctor_id
        }), 200

    target_user = db.session.get(User, user_id)
    if not target_user:
        return jsonify({'message': 'Target user not found'}), 404

    if requesting_user.is_doctor:
        return jsonify({
            'id': target_user.id,
            'first_name': target_user.first_name,
            'last_name': target_user.last_name,
            'email': target_user.email,
            'is_doctor': target_user.is_doctor
        }), 200

    return jsonify({
        'id': target_user.id,
        'first_name': target_user.first_name,
        'last_name': target_user.last_name,
        'is_doctor': target_user.is_doctor
    }), 200

@app.route('/api/favorites/add', methods=['POST'])
@jwt_required()
def add_favorite():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    user_id = data.get('user_id')
    doctor_id = data.get('doctor_id')
    if not user_id or not doctor_id or user_id != current_user_id:
        return jsonify({'message': 'Unauthorized or invalid data'}), 403
    if Favorite.query.filter_by(user_id=user_id, doctor_id=doctor_id).first():
        return jsonify({'message': 'Doctor already favorited'}), 400
    favorite = Favorite(user_id=user_id, doctor_id=doctor_id)
    db.session.add(favorite)
    db.session.commit()
    return jsonify({'message': 'Doctor added to favorites'}), 201

@app.route('/api/favorites/remove', methods=['POST'])
@jwt_required()
def remove_favorite():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    user_id = data.get('user_id')
    doctor_id = data.get('doctor_id')
    if not user_id or not doctor_id or user_id != current_user_id:
        return jsonify({'message': 'Unauthorized or invalid data'}), 403
    favorite = Favorite.query.filter_by(user_id=user_id, doctor_id=doctor_id).first()
    if favorite:
        db.session.delete(favorite)
        db.session.commit()
        return jsonify({'message': 'Doctor removed from favorites'}), 200
    return jsonify({'message': 'Doctor not found in favorites'}), 404

@socketio.on('connect')
def handle_connect():
    logger.info('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Client disconnected')

@socketio.on('join')
def handle_join(user_id, auth=None):
    if not auth or 'token' not in auth:
        logger.error("No token provided in join event")
        emit('error', {'message': 'No authentication token provided'})
        return

    token = auth['token']
    try:
        decoded = decode_token(token)
        jwt_user_id = int(decoded['sub'])
        if jwt_user_id == int(user_id):
            join_room(str(user_id))
            logger.info(f"User {user_id} joined room")
        else:
            logger.error(f"Unauthorized join attempt: JWT user {jwt_user_id} != {user_id}")
            emit('error', {'message': 'Unauthorized'})
    except Exception as e:
        logger.error(f"Error verifying token: {e}")
        emit('error', {'message': 'Authentication failed'})

@socketio.on('join_chat')
def handle_join_chat(data):
    room = data.get('room')
    if room:
        join_room(room)
        logger.info(f"User joined chat room: {room}")

@socketio.on('leave_chat')
def handle_leave_chat(data):
    room = data.get('room')
    if room:
        leave_room(room)
        logger.info(f"User left chat room: {room}")

@app.route('/api/messages/send', methods=['POST'])
@jwt_required()
def send_message():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    logger.debug(f"Received data for /api/messages/send: {data}")
    
    receiver_id = data.get('receiver_id')
    message_text = data.get('message_text')

    if not receiver_id or not message_text:
        logger.error(f"Missing fields: receiver_id={receiver_id}, message_text={message_text}")
        return jsonify({'message': 'receiver_id and message_text are required'}), 400

    receiver = db.session.get(User, receiver_id)
    if not receiver:
        logger.error(f"Receiver not found: receiver_id={receiver_id}")
        return jsonify({'message': 'Receiver not found'}), 404
    if receiver_id == current_user_id:
        logger.error("User attempted to message themselves")
        return jsonify({'message': 'Cannot send message to yourself'}), 400

    new_message = Message(
        sender_id=current_user_id,
        receiver_id=receiver_id,
        message_text=message_text
    )
    db.session.add(new_message)
    db.session.commit()

    message_data = {
        'id': new_message.id,
        'sender_id': new_message.sender_id,
        'receiver_id': new_message.receiver_id,
        'message_text': new_message.message_text,
        'sent_at': new_message.sent_at.isoformat(),
        'is_read': new_message.is_read
    }
    socketio.emit('new_message', message_data, room=str(receiver_id))
    socketio.emit('new_message', message_data, room=str(current_user_id))

    chat_room = f"chat_{min(current_user_id, receiver_id)}_{max(current_user_id, receiver_id)}"
    receiver_rooms = socketio.server.manager.rooms.get('/', {}).get(str(receiver_id), [])
    if chat_room in receiver_rooms:
        logger.info(f"Receiver {receiver_id} is in chat {chat_room}, skipping notification")
    else:
        sender = db.session.get(User, current_user_id)
        prefix = "New message from Dr." if sender.is_doctor else "New message from"
        preview_message = f"{prefix} {sender.first_name}: {message_text}"
        add_notification(
            receiver_id, 
            preview_message, 
            related_message=message_text, 
            sender_id=current_user_id, 
            notification_type='message'
        )

    logger.info(f"Message sent from {current_user_id} to {receiver_id}")
    return jsonify({'message': 'Message sent successfully', 'message_id': new_message.id}), 201

@app.route('/api/messages', methods=['POST'])
@jwt_required()
def get_messages():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    other_user_id = data.get('other_user_id')

    if not other_user_id:
        logger.error("other_user_id is required but not provided")
        return jsonify({'message': 'other_user_id is required'}), 400

    messages = Message.query.filter(
        ((Message.sender_id == current_user_id) & (Message.receiver_id == other_user_id)) |
        ((Message.sender_id == other_user_id) & (Message.receiver_id == current_user_id))
    ).order_by(Message.sent_at.asc()).all()

    return jsonify([{
        'id': msg.id,
        'sender_id': msg.sender_id,
        'receiver_id': msg.receiver_id,
        'message_text': msg.message_text,
        'sent_at': msg.sent_at.isoformat(),
        'is_read': msg.is_read
    } for msg in messages])

@app.route('/api/messages/mark-read', methods=['POST'])
@jwt_required()
def mark_messages_read():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    other_user_id = data.get('other_user_id')

    if not other_user_id:
        logger.error("other_user_id is required but not provided")
        return jsonify({'message': 'other_user_id is required'}), 400

    unread_messages = Message.query.filter_by(
        sender_id=other_user_id,
        receiver_id=current_user_id,
        is_read=False
    ).all()

    for msg in unread_messages:
        msg.is_read = True
    db.session.commit()

    logger.info(f"Messages from {other_user_id} to {current_user_id} marked as read")
    return jsonify({'message': 'Messages marked as read'}), 200

@app.route('/api/messages/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    current_user_id = int(get_jwt_identity())
    
    subquery = db.session.query(
        Message,
        func.row_number().over(
            partition_by=db.func.greatest(Message.sender_id, Message.receiver_id),
            order_by=Message.sent_at.desc()
        ).label('rn')
    ).filter(
        (Message.sender_id == current_user_id) | (Message.receiver_id == current_user_id)
    ).subquery()

    conversations = db.session.query(subquery).filter(subquery.c.rn == 1).all()

    result = []
    seen_users = set()
    for msg in conversations:
        other_user_id = msg.sender_id if msg.receiver_id == current_user_id else msg.receiver_id
        if other_user_id in seen_users:
            continue
        seen_users.add(other_user_id)

        other_user = db.session.get(User, other_user_id)
        if not other_user:
            continue

        result.append({
            'user_id': other_user_id,
            'first_name': other_user.first_name,
            'last_name': other_user.last_name,
            'is_doctor': other_user.is_doctor,
            'doctor_id': other_user.doctor_id,
            'latest_message': {
                'message_text': msg.message_text,
                'sent_at': msg.sent_at.isoformat(),
                'is_read': msg.is_read,
                'from_me': msg.sender_id == current_user_id
            }
        })

    logger.info(f"Conversations fetched for user {current_user_id}: {len(result)} found")
    return jsonify(result)

@app.route('/api/user/by-doctor-id', methods=['POST'])
@jwt_required()
def get_user_by_doctor_id():
    data = request.get_json()
    doctor_id = data.get('doctor_id')
    if not doctor_id:
        return jsonify({'message': 'doctor_id is required'}), 400

    user = User.query.filter_by(doctor_id=doctor_id).first()
    if not user:
        return jsonify({'message': 'User not found for this doctor'}), 404

    return jsonify({
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'is_doctor': user.is_doctor,
        'doctor_id': user.doctor_id
    }), 200

@app.route('/api/doctors/<int:doctor_id>/availability/week', methods=['GET'])
@jwt_required()
def get_weekly_availability(doctor_id):
    today = datetime.today()
    week_start = today.replace(hour=0, minute=0, second=0, microsecond=0)
    week_end = week_start + timedelta(days=7, hours=23, minutes=59, seconds=59)
    
    appointments = Appointment.query.filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date >= week_start,
        Appointment.appointment_date <= week_end,
        Appointment.status != "Cancelled"
    ).all()
    
    availability = []
    slots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
    for day_offset in range(8):
        day = week_start + timedelta(days=day_offset)
        day_start = day.replace(hour=0, minute=0, second=0)
        day_end = day.replace(hour=23, minute=59, second=59)
        day_appointments = [appt for appt in appointments if appt.appointment_date >= day_start and appt.appointment_date <= day_end]
        booked_slots = [appt.appointment_date.strftime('%H:%M') for appt in day_appointments]
        is_available = any(slot not in booked_slots for slot in slots)
        availability.append({
            "date": day.date().isoformat(),
            "is_available": is_available
        })
    
    return jsonify(availability)

@app.route('/api/doctors/<int:doctor_id>/availability/day', methods=['GET'])
@jwt_required()
def get_day_schedule(doctor_id):
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'message': 'date parameter is required'}), 400
    
    try:
        day = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'message': 'Invalid date format, use YYYY-MM-DD'}), 400
    
    day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    appointments = Appointment.query.filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date >= day_start,
        Appointment.appointment_date <= day_end,
        Appointment.status != "Cancelled"
    ).all()
    
    slots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
    booked_slots = [appt.appointment_date.strftime('%H:%M') for appt in appointments]
    schedule = [{"time": slot, "available": slot not in booked_slots} for slot in slots]
    return jsonify(schedule)

@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = int(get_jwt_identity())
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notifications])

@app.route('/api/notifications/<int:notification_id>/read', methods=['POST'])
@jwt_required()
def mark_notification_read(notification_id):
    user_id = int(get_jwt_identity())
    notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if not notification:
        return jsonify({'message': 'Notification not found'}), 404
    notification.is_read = True
    db.session.commit()
    return jsonify({'message': 'Notification marked as read'}), 200

@app.route('/api/notifications/add', methods=['POST'])
@jwt_required()
def add_notification_endpoint():
    data = request.get_json()
    user_id = data.get('user_id')
    message = data.get('message')

    if not user_id or not message:
        return jsonify({'message': 'user_id and message are required'}), 400

    notification = add_notification(user_id, message)
    return jsonify({'message': 'Notification added successfully', 'notification': notification.to_dict()}), 201

@app.route('/api/consultations/history', methods=['GET'])
@jwt_required()
def get_consultation_history():
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    if not user.is_doctor or not user.doctor_id:
        return jsonify({'message': 'Unauthorized: Doctors only'}), 403

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('limit', 5, type=int)

    query = Appointment.query.filter_by(doctor_id=user.doctor_id).filter(Appointment.status == 'Completed').order_by(Appointment.appointment_date.desc())
    appointments = query.paginate(page=page, per_page=per_page, error_out=False)

    response = {
        'consultations': [a.to_dict() for a in appointments.items],
        'total': appointments.total,
        'pages': appointments.pages,
        'page': appointments.page
    }
    return jsonify(response), 200

@app.route('/api/consultations', methods=['POST'])
@jwt_required()
def add_consultation():
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    if not user.is_doctor or not user.doctor_id:
        return jsonify({'message': 'Unauthorized: Doctors only'}), 403

    data = request.get_json()
    appointment_id = data.get('appointment_id')

    if not appointment_id:
        return jsonify({'message': 'Appointment ID is required'}), 400

    appointment = db.session.get(Appointment, appointment_id)
    if not appointment or appointment.doctor_id != user.doctor_id:
        return jsonify({'message': 'Invalid or mismatched appointment'}), 404

    appointment.status = 'Completed'
    db.session.commit()
    return jsonify({
        'message': 'Consultation added successfully',
        'consultation': appointment.to_dict()
    }), 201

@app.route('/api/attachments', methods=['POST'])
@jwt_required()
def add_attachment():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    name = data.get('name')
    attachment_type = data.get('type')
    description = data.get('description')
    content = data.get('content')
    appid = data.get('appid')

    if not all([name, attachment_type, appid]):
        return jsonify({'message': 'Missing required fields'}), 400

    if attachment_type not in ['note', 'file']:
        return jsonify({'message': 'Invalid attachment type'}), 400

    if attachment_type == 'note':
        content = 'note'
    elif not content:
        return jsonify({'message': 'Content required for file'}), 400

    extension = None
    if attachment_type == 'file' and '.' in name:
        extension = '.' + name.split('.')[-1].lower()

    attachment = Attachment(
        name=name,
        type=attachment_type,
        description=description,
        content=content,
        appid=appid,
        extension=extension
    )
    db.session.add(attachment)
    db.session.commit()

    return jsonify({'message': 'Attachment added successfully', 'attachment': attachment.to_dict()}), 201

@app.route('/api/attachments/<int:attachment_id>', methods=['DELETE'])
@jwt_required()
def delete_attachment(attachment_id):
    current_user_id = int(get_jwt_identity())
    attachment = db.session.get(Attachment, attachment_id)
    if not attachment:
        return jsonify({'message': 'Attachment not found'}), 404

    appointment = db.session.get(Appointment, attachment.appid)
    user = db.session.get(User, current_user_id)
    if not user or not user.is_doctor or user.doctor_id != appointment.doctor_id:
        return jsonify({'message': 'Unauthorized'}), 403

    db.session.delete(attachment)
    db.session.commit()
    return jsonify({'message': 'Attachment deleted successfully'}), 200

@app.route('/api/attachments/<int:appointment_id>', methods=['GET'])
@jwt_required()
def get_attachments(appointment_id):
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({'message': 'Unauthorized: Doctors only'}), 403

    appointment = db.session.get(Appointment, appointment_id)
    if not appointment:
        return jsonify({'message': 'Invalid or mismatched appointment'}), 404

    attachments = Attachment.query.filter_by(appid=appointment_id).all()
    return jsonify({
        'attachments': [a.to_dict() for a in attachments]
    }), 200

@app.route('/api/upload-document', methods=['POST'])
@jwt_required()
def upload_document():
    current_user_id = int(get_jwt_identity())
    if 'file' not in request.files:
        return jsonify({'message': 'No file provided'}), 400

    file = request.files['file']
    name = request.form.get('name')
    description = request.form.get('description')
    doctor_id = request.form.get('doctor_id')
    
    if not name or not doctor_id:
        return jsonify({'message': 'Name and doctor_id are required'}), 400

    user = db.session.get(User, current_user_id)
    if not user or user.is_doctor:
        return jsonify({'message': 'Only patients can upload documents'}), 403

    file_content = base64.b64encode(file.read()).decode('utf-8')
    extension = '.' + file.filename.split('.')[-1] if '.' in file.filename else ''

    document = Document(
        user_id=current_user_id,
        doctor_id=int(doctor_id),
        name=name,
        description=description,
        content=file_content,
        extension=extension
    )
    db.session.add(document)
    db.session.commit()
    message = f"New document '{name}' uploaded by {user.first_name} {user.last_name}"
    add_notification(
        user_id=int(doctor_id),
        message=message,
        notification_type='document_uploaded',
        sender_id=current_user_id
    )
    return jsonify({'message': 'Document uploaded successfully', 'document_id': document.id}), 201

@app.route('/api/user-documents/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_documents(user_id):
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    
    query = Document.query.filter_by(user_id=user_id)
    if user.is_doctor:
        query = query.filter_by(doctor_id=user.doctor_id)
    elif user_id != current_user_id:
        return jsonify({'message': 'Unauthorized'}), 403

    documents = query.all()
    return jsonify({'documents': [doc.to_dict() for doc in documents]}), 200

@app.route('/api/document/<int:document_id>', methods=['GET'])
@jwt_required()
def get_document_details(document_id):
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    document = db.session.get(Document, document_id)

    if not document:
        return jsonify({'message': 'Document not found'}), 404
    if document.user_id != current_user_id and (not user.is_doctor or document.doctor_id != user.doctor_id):
        return jsonify({'message': 'Unauthorized'}), 403

    if user.is_doctor and document.doctor_id == user.doctor_id and not document.viewed:
        document.viewed = True
        db.session.commit()
        message = f"Your document '{document.name}' was viewed by Dr. {user.first_name} {user.last_name}"
        add_notification(
            user_id=document.user_id,
            message=message,
            notification_type='document_viewed',
            sender_id=current_user_id
        )
    include_doctor_name = not user.is_doctor
    return jsonify(document.to_dict(include_doctor_name=True)), 200

@app.route('/api/document/<int:document_id>/notes', methods=['POST'])
@jwt_required()
def add_document_note(document_id):
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    document = db.session.get(Document, document_id)

    if not document:
        return jsonify({'message': 'Document not found'}), 404
    if not user.is_doctor or document.doctor_id != user.doctor_id:
        return jsonify({'message': 'Unauthorized - Only the assigned doctor can add notes'}), 403

    data = request.get_json()
    content = data.get('content', '').strip()

    if not content:
        return jsonify({'message': 'Note content cannot be empty'}), 400

    new_note = DocumentNote(
        document_id=document_id,
        doctor_id=user.doctor_id,
        content=content
    )
    db.session.add(new_note)
    db.session.commit()
    message = f"Dr. {user.first_name} {user.last_name} added a note to your document '{document.name}'"
    add_notification(
        user_id=document.user_id,
        message=message,
        notification_type='document_note_added',
        sender_id=current_user_id
    )
    return jsonify({'message': 'Note added successfully', 'note': new_note.to_dict()}), 201

@app.route('/api/document/note/<int:note_id>', methods=['PUT'])
@jwt_required()
def edit_document_note(note_id):
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    note = db.session.get(DocumentNote, note_id)

    if not note:
        return jsonify({'message': 'Note not found'}), 404
    document = db.session.get(Document, note.document_id)
    if not user.is_doctor or note.doctor_id != user.doctor_id or document.doctor_id != user.doctor_id:
        return jsonify({'message': 'Unauthorized - Only the assigned doctor can edit this note'}), 403

    data = request.get_json()
    content = data.get('content', '').strip()

    if not content:
        return jsonify({'message': 'Note content cannot be empty'}), 400

    note.content = content
    db.session.commit()

    return jsonify({'message': 'Note updated successfully', 'note': note.to_dict()}), 200

@app.route('/api/document/note/<int:note_id>', methods=['DELETE'])
@jwt_required()
def delete_document_note(note_id):
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    note = db.session.get(DocumentNote, note_id)

    if not note:
        return jsonify({'message': 'Note not found'}), 404
    document = db.session.get(Document, note.document_id)
    if not user.is_doctor or note.doctor_id != user.doctor_id or document.doctor_id != user.doctor_id:
        return jsonify({'message': 'Unauthorized - Only the assigned doctor can delete this note'}), 403

    db.session.delete(note)
    db.session.commit()

    return jsonify({'message': 'Note deleted successfully'}), 200

@app.route('/api/profile/edit', methods=['PUT'])
@jwt_required()
def edit_profile():
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided'}), 400

    if 'first_name' in data:
        if not data['first_name'].strip():
            return jsonify({'message': 'First name cannot be empty'}), 400
        user.first_name = data['first_name'].strip()
    if 'last_name' in data:
        if not data['last_name'].strip():
            return jsonify({'message': 'Last name cannot be empty'}), 400
        user.last_name = data['last_name'].strip()
    if 'password' in data:
        if not data.get('old_password'):
            return jsonify({'message': 'Old password is required to change the password'}), 400
        if not data['password']:
            return jsonify({'message': 'New password cannot be empty'}), 400
        
        if not bcrypt.check_password_hash(user.password, data['old_password']):
            return jsonify({'message': 'Incorrect old password'}), 401
        user.password = bcrypt.generate_password_hash(data['password']).decode('utf-8')

    if user.is_doctor and user.doctor_id:
        doctor = db.session.get(Doctor, user.doctor_id)
        if not doctor:
            return jsonify({'message': 'Doctor profile not found'}), 404

        if 'city' in data:
            if not data['city'].strip():
                return jsonify({'message': 'City cannot be empty'}), 400
            doctor.city = data['city'].strip()
        if 'address' in data:
            doctor.address = data['address'].strip() if data['address'] else None
        if 'phone' in data:
            doctor.phone = data['phone'].strip() if data['phone'] else None

    db.session.commit()
    return jsonify({
        'message': 'Profile updated successfully',
        'user': user.to_dict(),
        'doctor': doctor.to_dict() if user.is_doctor and user.doctor_id else None
    }), 200

@app.route('/api/appointment/update_status', methods=['POST'])
@jwt_required()
def update_appointment_status():
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    if not user or not user.is_doctor or not user.doctor_id:
        return jsonify({'message': 'Only doctors can update appointment status'}), 403

    data = request.get_json()
    appointment_id = data.get('appointment_id')
    new_status = data.get('status')

    if not appointment_id or not new_status:
        return jsonify({'message': 'appointment_id and status are required'}), 400

    if new_status not in ['Confirmed', 'Cancelled', 'Completed']:
        return jsonify({'message': 'Invalid status. Must be Confirmed, Cancelled, or Completed'}), 400

    appointment = db.session.get(Appointment, appointment_id)
    if not appointment:
        return jsonify({'message': 'Appointment not found'}), 404

    if appointment.doctor_id != user.doctor_id:
        return jsonify({'message': 'You are not authorized to update this appointment'}), 403

    appointment.status = new_status
    db.session.commit()

    patient_message = f"Your appointment on {appointment.appointment_date.strftime('%Y-%m-%d %H:%M')} has been {new_status.lower()} by Dr. {user.first_name} {user.last_name}."
    add_notification(appointment.user_id, patient_message)

    return jsonify({'message': f'Appointment status updated to {new_status}'}), 200

@app.route('/api/appointments/check_past', methods=['GET'])
@jwt_required()
def check_past_appointments():
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)
    if not user or not user.is_doctor or not user.doctor_id:
        return jsonify({'message': 'Only doctors can check past appointments'}), 403

    now = datetime.utcnow()

    past_appointments = Appointment.query.filter(
        Appointment.doctor_id == user.doctor_id,
        Appointment.appointment_date < now,
        Appointment.status.in_(['Pending', 'Confirmed'])
    ).all()

    notifications = []
    for appointment in past_appointments:
        existing_notification = Notification.query.filter_by(
            user_id=current_user_id,
            message=f"Appointment on {appointment.appointment_date.strftime('%Y-%m-%d %H:%M')} needs your action (Completed or Cancelled)."
        ).first()

        if not existing_notification:
            message = f"Appointment on {appointment.appointment_date.strftime('%Y-%m-%d %H:%M')} needs your action (Completed or Cancelled)."
            notification = add_notification(
                user_id=current_user_id,
                message=message,
                related_message={'appointment_id': appointment.id},
                notification_type='past_appointment'
            )
            notifications.append(notification.to_dict())

    return jsonify({'notifications': notifications}), 200

@app.route('/api/recent-doctors', methods=['GET'])
@jwt_required()
def get_recent_doctors():
    current_user_id = int(get_jwt_identity())
    user = db.session.get(User, current_user_id)

    if not user or user.is_doctor:
        return jsonify({'message': 'Unauthorized: Patients only'}), 403

    six_months_ago = datetime.utcnow() - timedelta(days=180)

    recent_appointments = (
        db.session.query(Appointment)
        .filter(Appointment.user_id == current_user_id)
        .filter(Appointment.appointment_date >= six_months_ago)
        .filter(Appointment.status == 'Completed')
        .all()
    )

    doctor_ids = list({appointment.doctor_id for appointment in recent_appointments})

    if not doctor_ids:
        return jsonify({'doctors': []}), 200

    doctors = (
        db.session.query(Doctor)
        .filter(Doctor.id.in_(doctor_ids))
        .all()
    )

    doctor_list = [
        {
            'id': doctor.id,
            'name': doctor.name,
            'specialty': doctor.specialty
        }
        for doctor in doctors
    ]

    return jsonify({'doctors': doctor_list}), 200

if __name__ == '__main__':
    # Run locally with Flask-SocketIO's development server
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
else:
    # Expose the WSGI application for production (Render, etc.)
    application = app
    # Optional: Explicitly initialize SocketIO for production compatibility
    socketio.init_app(app)