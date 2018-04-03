export default function prepareStartMode({ state }) {
    const interpretations = state.get('views.workflows.data.interpretations')
    const user = state.get('app.user')
    let startMode = null

    if (
        interpretations.find((i) => {
            return i.status === 'Ongoing' && i.user.id !== user.id
        })
    ) {
        startMode = 'override'
    } else if (interpretations.find((i) => i.status === 'Ongoing')) {
        startMode = 'save'
    } else {
        let not_started = interpretations.find((i) => i.status === 'Not started')
        if (not_started) {
            startMode = interpretations.length > 1 ? 'review' : 'start'
        } else if (interpretations.length && interpretations.every((i) => i.status === 'Done')) {
            startMode = 'reopen'
        } else {
            startMode = 'start'
        }
    }

    state.set('views.workflows.startMode', startMode)
    return {}
}
