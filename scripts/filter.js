const fs = require('fs')

function generateRandomizedList() {
    fs.readFile('assets/popular_words.txt', 'utf8' , (err, data) => {
        if (err) {
            console.error(err)
            return
        }
      //   console.log(data)
        let arr = data.split('\n')
        arr = arr.map(word => word.trim())
        arr = arr.filter(word => word.length === 5)
        let shuffled = []
        while(arr.length) {
            const next = arr.pop();
            const index = Math.floor(Math.random() * shuffled.length);
            const beginning = shuffled.slice(0,index);
            const end = shuffled.slice(index,shuffled.length);
            shuffled = beginning.concat(next, end);
        }
      
        fs.writeFile('assets/shuffled.txt', shuffled.toString(), err => {
            if (err) {
                console.log(err)
                return
            }
        })
      
        console.log(shuffled.length + ' words')
    })
}
