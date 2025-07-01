from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
user_balance = 10000


@app.route('/')
def index():
    return render_template('index.html', balance=user_balance)


@app.route('/use_promo', methods=['POST'])
def use_promo():
    global user_balance
    promo_code = request.form.get('promo_code')

    if promo_code == "BULATIK":
        user_balance += 1000
        return jsonify({'success': True, 'balance': user_balance, 'message': 'Промокод активирован! +1000 монет'})
    else:
        return jsonify({'success': False, 'message': 'Неверный промокод'})


@app.route('/spin', methods=['POST'])
def spin():
    global user_balance
    bet = int(request.form.get('bet', 10))

    if user_balance < bet:
        return jsonify({'success': False, 'message': 'Недостаточно средств'})

    user_balance -= bet
    import random
    result = [
        random.randint(1, 7),
        random.randint(1, 7),
        random.randint(1, 7)
    ]
    win = 0
    if result[0] == result[1] == result[2]:
        win = bet * 10
    user_balance += win
    return jsonify({
        'success': True,
        'result': result,
        'balance': user_balance,
        'win': win
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)