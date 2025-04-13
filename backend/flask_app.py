from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_socketio import SocketIO, emit, join_room
from flask_jwt_extended import JWTManager, decode_token, jwt_required, create_access_token, get_jwt_identity, verify_jwt_in_request
import logging
from sqlalchemy import distinct, func
from sqlalchemy.dialects.postgresql import ENUM

# Define ENUM types with names
GenderEnum = ENUM('Male', 'Female', name='gender_enum', create_type=True)
StatusEnum = ENUM('Pending', 'Confirmed', 'Completed', 'Cancelled', name='status_enum', create_type=True)

#logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="*" , async_mode='gevent')

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://neondb_owner:npg_yDgHEK8r9vXe@ep-ancient-bush-a87ccgy7-pooler.eastus2.azure.neon.tech/neondb?sslmode=require'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-secret-key-here'

db = SQLAlchemy(app)

# Doctor model
class Doctor(db.Model):
    __tablename__ = 'doctors'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    specialty = db.Column(db.String(50), nullable=False)
    city = db.Column(db.String(50), nullable=False)
    image = db.Column(db.String(200))
    gender = db.Column(GenderEnum)
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

    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'is_doctor': self.is_doctor,
            'doctor_id': self.doctor_id
        }

# Message model (single definition)
class Message(db.Model):
    __tablename__ = 'messages'
    __table_args__ = {'extend_existing': True}
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message_text = db.Column(db.Text, nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)

# Appointment model
class Appointment(db.Model):
    __tablename__ = 'appointments'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(StatusEnum, default='Pending')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'doctor_id': self.doctor_id,
            'appointment_date': self.appointment_date.isoformat(),
            'status': self.status
        }

# Favorite model
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

# Public endpoints (no token required)
@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    doctors = Doctor.query.all()
    return jsonify([doctor.to_dict() for doctor in doctors])

@app.route('/api/doctors/<int:id>', methods=['GET'])
def get_doctor_by_id(id):
    doctor = db.session.get(Doctor, id)
    if doctor:
        return jsonify(doctor.to_dict())
    return jsonify({'message': 'Doctor not found'}), 404

# Login endpoint (POST)
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

# Register endpoint (POST)
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

# Protected endpoints (require JWT)
@app.route('/api/appointments', methods=['POST'])
@jwt_required()
def get_appointments():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    user_id = data.get('user_id')
    if not user_id or user_id != current_user_id:
        return jsonify({'message': 'Unauthorized or invalid user ID'}), 403
    appointments = Appointment.query.filter_by(user_id=user_id).all()
    return jsonify([appointment.to_dict() for appointment in appointments])

@app.route('/api/doctor-appointments', methods=['POST'])
@jwt_required()
def get_doctor_appointments():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    doctor_id = data.get('doctor_id')
    
    user = db.session.get(User, current_user_id)
    if not user or not user.is_doctor or user.doctor_id != doctor_id:
        return jsonify({'message': 'Unauthorized: You can only view your own appointments'}), 403

    appointments = Appointment.query.filter_by(doctor_id=doctor_id).all()
    return jsonify([appointment.to_dict() for appointment in appointments])

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

    db.session.delete(appointment)
    db.session.commit()
    return jsonify({'message': 'Appointment deleted successfully'}), 200

@app.route('/api/appointments/book', methods=['POST'])
@jwt_required()
def book_appointment():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    doctor_id = data.get('doctor_id')
    appointment_date = datetime.strptime(data.get('appointment_date'), '%Y-%m-%dT%H:%M:%S')

    if not doctor_id or not appointment_date:
        return jsonify({'message': 'doctor_id and appointment_date are required'}), 400

    user = db.session.get(User, current_user_id)
    if user.is_doctor and user.doctor_id == doctor_id:
        return jsonify({'message': 'Doctors cannot book their own appointments'}), 403

    if Appointment.query.filter_by(doctor_id=doctor_id, appointment_date=appointment_date).first():
        return jsonify({'message': 'This time slot is already booked'}), 409

    new_appointment = Appointment(
        user_id=current_user_id,
        doctor_id=doctor_id,
        appointment_date=appointment_date,
        status='Pending'
    )
    db.session.add(new_appointment)
    db.session.commit()
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

    # If no user_id or requesting own profile, return full details
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

    # Doctors can view patient profiles
    if requesting_user.is_doctor:
        return jsonify({
            'id': target_user.id,
            'first_name': target_user.first_name,
            'last_name': target_user.last_name,
            'email': target_user.email,
            'is_doctor': target_user.is_doctor
        }), 200

    # Non-doctors can view minimal info (name only) for messaging
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

# SocketIO event handlers
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
        jwt_user_id = int(decoded['sub'])  # 'sub' contains the user ID from JWT
        if jwt_user_id == int(user_id):
            join_room(str(user_id))
            logger.info(f"User {user_id} joined room")
        else:
            logger.error(f"Unauthorized join attempt: JWT user {jwt_user_id} != {user_id}")
            emit('error', {'message': 'Unauthorized'})
    except Exception as e:
        logger.error(f"Error verifying token: {e}")
        emit('error', {'message': 'Authentication failed'})

# Send a message
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

    logger.info(f"Message sent from {current_user_id} to {receiver_id}")
    return jsonify({'message': 'Message sent successfully', 'message_id': new_message.id}), 201

# Get messages between current user and another user
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

# Mark messages as read
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

# Get conversations
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
    today = datetime.today()  # Start from today
    week_start = today.replace(hour=0, minute=0, second=0, microsecond=0)  # Midnight today
    week_end = week_start + timedelta(days=7, hours=23, minutes=59, seconds=59)  # 6 days ahead
    
    appointments = Appointment.query.filter(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date >= week_start,
        Appointment.appointment_date <= week_end
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
        Appointment.appointment_date <= day_end
    ).all()
    
    slots = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]
    booked_slots = [appt.appointment_date.strftime('%H:%M') for appt in appointments]
    schedule = [{"time": slot, "available": slot not in booked_slots} for slot in slots]
    return jsonify(schedule)

if __name__ == '__main__':
    # Run locally with Flask-SocketIO's development server
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
else:
    # Expose the WSGI application for production (Render, etc.)
    application = app
    # Optional: Explicitly initialize SocketIO for production compatibility
    socketio.init_app(app)