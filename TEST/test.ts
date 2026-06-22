var message: string = `Hey there! this is a "test" haha. a secondary part that has "a quoted part" okay but what if its like " only one. wait that works too, and what if i do like "this" yeah no thats not what i want i think. or is it oh my i fixed it`;

var capture_quotes: { quoted: boolean; txt: string }[] = [];

message.match(/"\b.*?"/gi)?.forEach((part: string) => {
    const split_msg = message.split(part);

    if (split_msg[0])
        capture_quotes.push({ quoted: false, txt: split_msg[0] });
    message = split_msg[1];
    capture_quotes.push({ quoted: true, txt: part });
});
capture_quotes.push({ quoted: false, txt: message });

console.log(capture_quotes);

//

// var texts = [];
// var current_text = '';
// var quoted_text = '';
// var capturing = false;

// for (const char of message) {
//     if (capturing) {
//         if (char == '"') {
//             capturing = false;
//             texts.push({ quoted: true, txt: quoted_text });
//             quoted_text = '';
//         } else {
//             quoted_text += char;
//         }
//     } else {
//         if (char == '"') {
//             quoted_text += char;
//             capturing = true;
//             if (current_text != '') {
//                 texts.push({ quoted: false, txt: current_text });
//             }
//             current_text = '';
//         } else {
//             current_text += char;
//         }
//     }
// }
// console.log(texts);
