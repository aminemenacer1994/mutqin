@php
    $ackee = \App\Support\Ackee::clientConfig(request());
@endphp
<script>
    window.mutqinAckee = @json($ackee);
</script>
@if (!empty($ackeeInlinePageview) && !empty($ackee['enabled']))
<script>
    (function () {
        try {
            var c = window.mutqinAckee;
            if (!c || !c.enabled || !c.server || !c.domainId) return;
            var host = String(location.hostname || '');
            if (!c.allowLocalhost && /^(localhost|127\.0\.0\.1|::1)$/i.test(host)) return;
            var path = location.pathname || '/';
            if (/^\/email\/verify(\/|$)/i.test(path)) path = '/email/verify';
            else if (/^\/reset-password(\/|$)/i.test(path)) path = '/reset-password';
            else if (/^\/password\/reset(\/|$)/i.test(path)) path = '/password/reset';
            fetch(c.server + '/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'omit',
                keepalive: true,
                body: JSON.stringify({
                    query: 'mutation createRecord($domainId: ID!, $input: CreateRecordInput!) { createRecord(domainId: $domainId, input: $input) { payload { id } } }',
                    variables: { domainId: c.domainId, input: { siteLocation: location.origin + path } }
                })
            }).catch(function () {});
        } catch (e) {}
    })();
</script>
@endif
