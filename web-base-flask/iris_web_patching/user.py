from flask import Blueprint, render_template, request, flash, redirect, url_for, session
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, login_required, current_user, logout_user
from . import views
from . import db
from .models import User

user = Blueprint("user", __name__, template_folder='templates')


@user.route('/login', methods=["POST", "GET"])
def login():
    if request.method == "POST":
        email = request.form.get("email")
        password = request.form.get("password")
        user = User.query.filter_by(email=email).first()
        if user:
            if check_password_hash(user.password, password):
                session.permanent = True
                flash("Logged in success!", category="success")
                login_user(user, remember=True)
                return redirect(url_for("views.home"))
            else:
                flash("Wrong password, please check again!", category="error")
        else:
            flash("User does not exist!", category="error")
    return render_template("login.html", user=current_user)


@user.route('/signup', methods=["POST", "GET"])
def signup():
    if request.method == "POST":
        email = request.form.get("email")
        user_name = request.form.get("user_name")
        password = request.form.get("password")
        confirm_password = request.form.get("confirm_password")

        # user validation
        user = User.query.filter_by(email=email).first()
        if user:
            flash("User existed", category="error")
        elif len(email) < 4:
            flash("Email must be greater than 3 characters", category="error")
        elif len(password) < 7:
            flash("Password must be greater than 7 characters", category="error")
        elif password != confirm_password:
            flash("Password does not match", category="error")
        else:
            password = generate_password_hash(password, method="sha256")
            new_user = User(email, password, user_name)
            try:
                db.session.add(new_user)
                db.session.commit()
                flash("User created!", category="success")
                login_user(user, remember=True)
                return redirect(url_for("views.home"))
            except:
                print("error")

    return render_template("signup.html", user=current_user)


@user.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for("user.login"))
