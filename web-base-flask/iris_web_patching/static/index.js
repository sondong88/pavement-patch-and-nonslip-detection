const deleteNote = (noteId) => {
    fetch("/delete-note", {
        method: "POST",
        body: JSON.stringify({noteId: noteId}),
    }).then( (response) => {
        window.location.href = "/";
    })
}