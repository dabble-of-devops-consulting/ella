export default function redirectToSection({ props, state, route }) {
    const section = props.section
    const sections = state.get('views.overview.sections')
    const sectionKeys = state.get('views.overview.sectionKeys')

    // If section is valid, redirect directly
    if (sectionKeys && section in sectionKeys) {
        route.redirect(`/overview/${section}`)
        return
    }
    // If not, check if we have previously selected section
    if (sections) {
        let selected = state.get('views.overview.state.selectedSection')
        if (selected) {
            route.redirect(`/overview/${selected}`)
            return
        }
    }

    // Fallbacks
    if (sectionKeys) {
        route.redirect(`/overview/${sectionKeys[0]}`)
        return
    } else {
        console.error('No available sections', sectionKeys)
    }
}
